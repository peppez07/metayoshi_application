/**
 * Every supported Bitcoin-style coin, end to end against mock ElectrumX
 * servers, with the same checks the BitcoinZ wallet test makes: enable the
 * coin, refuse a server for another chain, connect, read balance and history,
 * reject bad sends, build and sign a send (and a send-max), broadcast, and
 * refuse to broadcast the coin's transaction on another network.
 */
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import { WebSocketServer } from 'ws'
import * as secp from '@noble/secp256k1'
import { ALL_NETWORKS, BTCZ_NETWORK, DEFAULT_ENABLED_NETWORKS, NETWORKS, RTM_NETWORK, type NetworkParams } from '../lib/networks'
import { addressToScript, addressToScriptHash, deriveAccountKey } from '../lib/rtm/address'
import { bytesToHex, compactSize, concatBytes, hexToBytes, reverseBytes, sha256d, u32LE, u64LE, varBytes } from '../lib/rtm/bytes'
import { legacySighash } from '../lib/rtm/transaction'
import { LEGACY_TX_VERSION, parseLegacyTx } from '../lib/coins/legacy'

const memory = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => memory.set(key, value),
  removeItem: (key: string) => memory.delete(key)
})
const { useWalletStore, walletKey } = await import('./walletStore')
const { WALLET_STORAGE_KEY } = await import('../lib/walletStorage')
const { ElectrumClient } = await import('../lib/electrum/client')
const { RtmElectrum } = await import('../lib/electrum/rtmElectrum')

/** Real block 478559 headers: the first block after Bitcoin Cash split from Bitcoin. */
const BTC_478559 = '02000020432d350741fbf28f2e1486eabe2c4e143bfe2241af6518010000000000000000188c31adc46b1a62864e9a12560523004fd038d875720b4537504565182ea65fb480805935470118babd8db7'
const BCH_478559 = '00000020432d350741fbf28f2e1486eabe2c4e143bfe2241af6518010000000000000000abaa4bd8a48c1c6bc08ee39b66065e5e9484304cab8b56d5eed3e40b1ac996c899c480593547011822ca4ae8'
const CHECKPOINT_HEADERS: Record<string, string> = { btc: BTC_478559 }

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const TIP = 1_500_000
const FUNDS = 500_000_000n
const LEGACY_COINS = ALL_NETWORKS.filter((n) => n.supported && n.family === 'legacy')
const PENDING_COINS = ALL_NETWORKS.filter((n) => !n.supported)

function fundingTx(script: Uint8Array, segwit: boolean): { hex: string; txid: string } {
  const input = concatBytes(new Uint8Array(32).fill(0x44), u32LE(1), varBytes(Uint8Array.of(0x51)), u32LE(0xffffffff))
  const body = concatBytes(compactSize(1), input, compactSize(1), u64LE(FUNDS), varBytes(script))
  const txid = bytesToHex(reverseBytes(sha256d(concatBytes(u32LE(1), body, u32LE(0)))))
  const raw = segwit
    ? concatBytes(u32LE(1), Uint8Array.of(0, 1), body, compactSize(1), varBytes(new Uint8Array(33).fill(2)), u32LE(0))
    : concatBytes(u32LE(1), body, u32LE(0))
  return { hex: bytesToHex(raw), txid }
}

/** What the coin under test looks like on chain; each test points it at its coin. */
const chain = {
  /** Header the server returns at the coin's checkpoint height, if it has one. */
  checkpointHeader: '',
  timeOffset: 68,
  ownScriptHash: '',
  funding: { hex: '', txid: '' }
}

/** ElectrumX stand-in over WebSocket that reports the given genesis hash. */
function startServer(genesis: () => string) {
  const server = new WebSocketServer({ port: 0 })
  const log = { calls: [] as string[], broadcasts: [] as string[], balanceQueries: [] as string[] }
  const header = () => {
    // nTime where the coin keeps it (byte 68, or 100 for LBRY-style headers).
    const bytes = new Uint8Array(Math.max(80, chain.timeOffset + 12))
    new DataView(bytes.buffer).setUint32(chain.timeOffset, 1_700_000_000, true)
    return bytesToHex(bytes)
  }
  const own = (sh: string) => sh === chain.ownScriptHash
  const handlers: Record<string, (params: any[]) => unknown> = {
    'server.version': () => ['ElectrumX 1.16.0', '1.4'],
    'server.features': () => ({ genesis_hash: genesis(), server_version: 'ElectrumX 1.16.0' }),
    'blockchain.headers.subscribe': () => ({ height: TIP, hex: '' }),
    'blockchain.scripthash.get_balance': ([sh]) => {
      log.balanceQueries.push(sh)
      return own(sh) ? { confirmed: Number(FUNDS), unconfirmed: 0 } : { confirmed: 0, unconfirmed: 0 }
    },
    'blockchain.scripthash.get_history': ([sh]) => (own(sh) ? [{ tx_hash: chain.funding.txid, height: TIP - 5 }] : []),
    'blockchain.scripthash.listunspent': ([sh]) => (own(sh) ? [{ tx_hash: chain.funding.txid, tx_pos: 0, value: Number(FUNDS), height: TIP - 5 }] : []),
    'blockchain.scripthash.subscribe': () => 'status',
    'blockchain.transaction.get': ([txid]) => {
      if (txid !== chain.funding.txid) throw { code: 2, message: 'unknown transaction' }
      return chain.funding.hex
    },
    'blockchain.block.header': ([height]) => (chain.checkpointHeader && height === 478559 ? chain.checkpointHeader : header()),
    'blockchain.relayfee': () => 0.00001,
    'blockchain.estimatefee': () => 0.0001,
    'blockchain.transaction.broadcast': ([hex]) => {
      log.broadcasts.push(hex)
      return bytesToHex(reverseBytes(sha256d(hexToBytes(hex))))
    }
  }
  server.on('connection', (socket) => {
    socket.on('message', (raw) => {
      const msg = JSON.parse(String(raw))
      log.calls.push(msg.method)
      const handler = handlers[msg.method]
      try {
        if (!handler) throw { code: -32601, message: `unknown method ${msg.method}` }
        socket.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: handler(msg.params ?? []) }))
      } catch (error: any) {
        socket.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error }))
      }
    })
  })
  const url = () => `ws://127.0.0.1:${(server.address() as { port: number }).port}`
  const reset = () => { log.calls = []; log.broadcasts = []; log.balanceQueries = [] }
  const listening = () => new Promise<void>((resolve) => (server.address() ? resolve() : server.once('listening', () => resolve())))
  return { server, log, url, reset, listening }
}

let coinGenesis = ''
const coinServer = startServer(() => coinGenesis)
// Stands in for a Raptoreum server: the wrong chain for every coin under test.
const rtmServer = startServer(() => RTM_NETWORK.genesisHash)

beforeAll(async () => {
  await Promise.all([coinServer.listening(), rtmServer.listening()])
  await useWalletStore.getState().initialize('correct horse battery staple', MNEMONIC)
  await useWalletStore.getState().addAccount()
  useWalletStore.setState({ peerDiscovery: false })
})

afterAll(async () => {
  useWalletStore.getState().wipeVault()
  await new Promise((resolve) => setTimeout(resolve, 50))
  coinServer.server.close()
  rtmServer.server.close()
  vi.unstubAllGlobals()
})

async function until(check: () => boolean, timeoutMs = 5000): Promise<void> {
  const start = Date.now()
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error('Timed out')
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}

function verifyInput(network: NetworkParams, hex: string, ownScript: Uint8Array, pubkey: Uint8Array): void {
  const tx = parseLegacyTx(hex)
  const unsigned = { ...tx, inputs: tx.inputs.map((i) => ({ ...i, scriptSig: new Uint8Array() })) }
  const scriptSig = tx.inputs[0].scriptSig
  const der = scriptSig.slice(1, scriptSig[0])
  expect(scriptSig[scriptSig[0]]).toBe(0x01)
  expect(bytesToHex(scriptSig.slice(scriptSig[0] + 2))).toBe(bytesToHex(pubkey))
  const rLength = der[3]
  const pad = (n: Uint8Array) => { const o = new Uint8Array(32); o.set(n.slice(-32), 32 - Math.min(32, n.length)); return o }
  const compact = concatBytes(pad(der.slice(4, 4 + rLength)), pad(der.slice(6 + rLength)))
  expect(secp.verify(compact, legacySighash(unsigned, 0, ownScript), pubkey, { prehash: false }), network.id).toBe(true)
}

function sats(amount: string): bigint {
  return BigInt(Math.round(Number(amount) * 1e8))
}

describe.each(LEGACY_COINS.map((n, i) => [n.symbol, n.id, i] as const))('%s', (_symbol, id, index) => {
  test('works like BitcoinZ: enable, connect, history, send, send max, broadcast', async () => {
    const network = NETWORKS[id]
    const own = await deriveAccountKey(MNEMONIC, 0, network)
    const second = await deriveAccountKey(MNEMONIC, 1, network)
    const recipient = second.address
    const ownScript = addressToScript(own.address, network)
    coinGenesis = network.genesisHash
    chain.timeOffset = network.headerTimeOffset
    chain.ownScriptHash = addressToScriptHash(own.address, network)
    chain.funding = fundingTx(ownScript, index % 2 === 0)
    chain.checkpointHeader = CHECKPOINT_HEADERS[id] ?? ''
    coinServer.reset()
    rtmServer.reset()

    // Coins outside the defaults must be enabled before they can be selected; enabling derives every account's address.
    if (!DEFAULT_ENABLED_NETWORKS.includes(id)) {
      useWalletStore.getState().setNetwork(id)
      expect(useWalletStore.getState().network).toBe('rtm')
    }
    await useWalletStore.getState().enableNetwork(id)
    let state = useWalletStore.getState()
    expect(state.enabledNetworks).toContain(id)
    expect(state.accounts.map((a) => a.addresses[id])).toEqual([own.address, second.address])

    // The server for another chain is skipped before any address is queried; the setting moves to the one that passed.
    useWalletStore.setState((s) => ({ coinServers: { ...s.coinServers, [id]: { servers: [rtmServer.url(), coinServer.url()], activeServer: rtmServer.url() } } }))
    useWalletStore.getState().setActiveAccount('acc-1')
    useWalletStore.getState().setNetwork(id)
    await until(() => useWalletStore.getState().connection === 'connected' && useWalletStore.getState().network === id)
    await until(() => Boolean(useWalletStore.getState().activity[walletKey(id, 'acc-1')]))
    expect(rtmServer.log.balanceQueries).toEqual([])

    state = useWalletStore.getState()
    expect(state.coinServers[id].activeServer).toBe(coinServer.url())
    expect(state.tipHeight).toBe(TIP)
    expect(state.assetsReady).toBe(false)
    expect(state.balances[walletKey(id, 'acc-1')]).toEqual({ confirmed: FUNDS.toString(), unconfirmed: '0' })
    expect(state.activity[walletKey(id, 'acc-1')][0]).toMatchObject({ txid: chain.funding.txid, height: TIP - 5, rtmDelta: FUNDS.toString(), timestamp: 1_700_000_000_000 })
    expect(new Set(coinServer.log.balanceQueries)).toEqual(new Set([chain.ownScriptHash]))

    // Bad sends are refused before anything is signed.
    const store = useWalletStore.getState()
    await expect(store.prepareCoinSend({ network: 'rtm', to: recipient, amount: '1' })).rejects.toThrow(/Switch MetaYoshi to Raptoreum/)
    const btczAddress = (await deriveAccountKey(MNEMONIC, 0, BTCZ_NETWORK)).address
    await expect(store.prepareCoinSend({ network: id, to: btczAddress, amount: '1' })).rejects.toThrow(`Enter a valid ${network.name} address`)
    await expect(store.prepareCoinSend({ network: id, to: recipient, amount: '0' })).rejects.toThrow(/greater than zero/)
    await expect(store.prepareCoinSend({ network: id, to: recipient, amount: '6' })).rejects.toThrow(/Insufficient/)
    await expect(store.prepareAssetSend({ assetId: 'ab'.repeat(32), to: recipient, amount: '1' })).rejects.toThrow(/Raptoreum/)

    // A normal send: recipient output, change back to the sender, signed with the account key.
    const prepared = await store.prepareCoinSend({ network: id, to: recipient, amount: '1.25' })
    expect(prepared).toMatchObject({ kind: 'coin', network: id, symbol: network.symbol, accountId: 'acc-1', from: own.address, to: recipient, amount: '1.25' })
    const tx = parseLegacyTx(prepared.hex)
    expect(tx.version).toBe(LEGACY_TX_VERSION)
    expect(tx.inputs.map((i) => i.txid)).toEqual([chain.funding.txid])
    expect(tx.outputs).toHaveLength(2)
    expect(bytesToHex(tx.outputs[0].script)).toBe(bytesToHex(addressToScript(recipient, network)))
    expect(tx.outputs[0].value).toBe(125_000_000n)
    expect(bytesToHex(tx.outputs[1].script)).toBe(bytesToHex(ownScript))
    expect(tx.outputs.reduce((n, o) => n + o.value, 0n) + sats(prepared.fee)).toBe(FUNDS)
    verifyInput(network, prepared.hex, ownScript, own.pubkey)

    // Send max: one output carrying everything but the fee.
    const max = await store.prepareCoinSend({ network: id, to: recipient, amount: '', sendMax: true })
    const maxTx = parseLegacyTx(max.hex)
    expect(maxTx.outputs).toHaveLength(1)
    expect(maxTx.outputs[0].value + sats(max.fee)).toBe(FUNDS)
    expect(sats(max.amount)).toBe(maxTx.outputs[0].value)
    verifyInput(network, max.hex, ownScript, own.pubkey)

    const txid = await store.broadcast(prepared)
    expect(txid).toBe(prepared.txid)
    expect(coinServer.log.broadcasts).toEqual([prepared.hex])
    expect(useWalletStore.getState().sent[0]).toMatchObject({ txid, network: id, accountId: 'acc-1', amount: '1.25' })
    // The Raptoreum-only extensions are never requested from this coin's server.
    expect(coinServer.log.calls).not.toContain('blockchain.transaction.get_in_block')
    expect(coinServer.log.calls.some((m) => m.includes('assets'))).toBe(false)

    // A transaction prepared for this coin cannot be broadcast on Raptoreum.
    useWalletStore.setState({ servers: [rtmServer.url()], activeServer: rtmServer.url() })
    useWalletStore.getState().setNetwork('rtm')
    await until(() => useWalletStore.getState().connection === 'connected' && useWalletStore.getState().network === 'rtm')
    await expect(useWalletStore.getState().broadcast(max)).rejects.toThrow(`This transaction is for ${network.name}`)
    expect(coinServer.log.broadcasts).toHaveLength(1)
    expect(rtmServer.log.broadcasts).toHaveLength(0)
    // The Raptoreum session queries its own address; only Ravencoin shares it (see below).
    const rtmAddress = (await deriveAccountKey(MNEMONIC, 0, RTM_NETWORK)).address
    if (own.address !== rtmAddress) expect(rtmServer.log.balanceQueries).not.toContain(chain.ownScriptHash)
  })
})

test('Ravencoin is the only coin whose address matches Raptoreum (same coin type 175 and prefix 0x3c)', async () => {
  const rtmAddress = (await deriveAccountKey(MNEMONIC, 0, RTM_NETWORK)).address
  const shared = LEGACY_COINS.filter((n) => useWalletStore.getState().accounts[0].addresses[n.id] === rtmAddress).map((n) => n.id)
  expect(shared).toEqual(['rvn'])
})

test('a Bitcoin Cash server is refused for Bitcoin although the genesis block is the same', async () => {
  coinGenesis = NETWORKS.btc.genesisHash
  const url = `ws://127.0.0.1:${(coinServer.server.address() as { port: number }).port}`
  for (const [header, ok] of [[BCH_478559, false], [BTC_478559, true], ['', false]] as const) {
    chain.checkpointHeader = header
    const api = new RtmElectrum(new ElectrumClient(url), NETWORKS.btc)
    const result = api.verifyNetwork()
    if (ok) await expect(result).resolves.toMatchObject({ genesisHash: NETWORKS.btc.genesisHash })
    else await expect(result).rejects.toThrow(/not on the Bitcoin chain/)
    api.client.close()
  }
})

test('covers all 66 supported Bitcoin-style coins', () => {
  expect(LEGACY_COINS).toHaveLength(66)
})

test('coins whose transactions are not implemented cannot be enabled', async () => {
  expect(PENDING_COINS.length).toBeGreaterThan(0)
  for (const coin of PENDING_COINS) {
    expect(coin.pendingReason, coin.id).toBeTruthy()
    await useWalletStore.getState().enableNetwork(coin.id)
  }
  const { enabledNetworks, accounts } = useWalletStore.getState()
  expect(enabledNetworks.filter((id) => PENDING_COINS.some((c) => c.id === id))).toEqual([])
  expect(Object.keys(accounts[0].addresses).filter((id) => PENDING_COINS.some((c) => c.id === id))).toEqual([])
})

test('enabled coins and their servers persist', async () => {
  await new Promise((resolve) => setTimeout(resolve, 50))
  const saved = JSON.parse(memory.get(WALLET_STORAGE_KEY)!).state
  const coinIds = LEGACY_COINS.map((n) => n.id)
  const expected = [...DEFAULT_ENABLED_NETWORKS, ...coinIds.filter((id) => !DEFAULT_ENABLED_NETWORKS.includes(id))]
  expect(saved.enabledNetworks).toEqual(expected)
  for (const id of coinIds) expect(saved.coinServers[id], id).toMatchObject({ activeServer: coinServer.url() })

  await useWalletStore.persist.rehydrate()
  const state = useWalletStore.getState()
  expect(state.enabledNetworks).toEqual(expected)
  for (const id of coinIds) expect(state.coinServers[id].activeServer, id).toBe(coinServer.url())
})

test('removing every coin switches back to Raptoreum and keeps the derived addresses', () => {
  const coinIds = LEGACY_COINS.map((n) => n.id)
  useWalletStore.getState().setNetwork(coinIds[0])
  for (const id of coinIds) useWalletStore.getState().disableNetwork(id)
  const state = useWalletStore.getState()
  expect(state.network).toBe('rtm')
  expect(state.enabledNetworks).toEqual(['rtm', 'btcz'])
  for (const id of coinIds) expect(state.accounts[0].addresses[id], id).toBeTruthy()
})
