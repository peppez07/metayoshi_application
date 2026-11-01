import { afterAll, beforeAll, expect, test, vi } from 'vitest'
import { WebSocketServer } from 'ws'
import * as secp from '@noble/secp256k1'
import { BTCZ_NETWORK, RTM_NETWORK } from '../lib/networks'
import { addressToScript, addressToScriptHash, deriveAccountKey } from '../lib/rtm/address'
import { bytesToHex } from '../lib/rtm/bytes'
import {
  CANOPY_BRANCH_ID,
  parseZcashTx,
  SAPLING_VERSION_GROUP_ID,
  saplingSighash,
  serializeZcashTx,
  TX_EXPIRY_DELTA,
  zcashTxid,
  type ZcashTransaction
} from '../lib/btcz/transaction'

const memory = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => memory.set(key, value),
  removeItem: (key: string) => memory.delete(key)
})
const { serverStateOf, useWalletStore, walletKey } = await import('./walletStore')

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const TIP = 1_900_000
const FUNDING_HEIGHT = 1_899_990
const BLOCK_TIME = 1_760_000_000

function listening(server: WebSocketServer): Promise<void> {
  return server.address() ? Promise.resolve() : new Promise((resolve) => server.once('listening', () => resolve()))
}

function fundingTx(script: Uint8Array): ZcashTransaction {
  return {
    version: 0x80000004,
    overwintered: true,
    txVersion: 4,
    versionGroupId: SAPLING_VERSION_GROUP_ID,
    inputs: [{ txid: '33'.repeat(32), vout: 0, scriptSig: Uint8Array.of(0x51), sequence: 0xffffffff }],
    outputs: [{ value: 250_000_000n, script }],
    locktime: 0,
    expiryHeight: FUNDING_HEIGHT + 20,
    valueBalance: 0n,
    shieldedSpends: [],
    shieldedOutputs: [],
    joinSplits: [],
    joinSplitPubKey: new Uint8Array(),
    joinSplitSig: new Uint8Array(),
    bindingSig: new Uint8Array()
  }
}

/** ElectrumX stand-in for one chain, over WebSocket. */
function startServer(genesis: string, ownScriptHash: string, fundingHex: string) {
  const server = new WebSocketServer({ port: 0 })
  const calls: string[] = []
  const broadcasts: string[] = []
  const balanceQueries: string[] = []
  const fundingTxid = zcashTxid(parseZcashTx(fundingHex))
  const header = new Uint8Array(1487)
  new DataView(header.buffer).setUint32(100, BLOCK_TIME, true)
  const handlers: Record<string, (params: any[]) => unknown> = {
    'server.version': () => ['ElectrumX 1.16.0', '1.4'],
    'server.features': () => ({ genesis_hash: genesis, server_version: 'ElectrumX 1.16.0' }),
    'blockchain.headers.subscribe': () => ({ height: TIP, hex: '00'.repeat(1487) }),
    'blockchain.scripthash.get_balance': ([sh]) => {
      balanceQueries.push(sh)
      return sh === ownScriptHash ? { confirmed: 250_000_000, unconfirmed: 0 } : { confirmed: 0, unconfirmed: 0 }
    },
    'blockchain.scripthash.get_history': ([sh]) => (sh === ownScriptHash ? [{ tx_hash: fundingTxid, height: FUNDING_HEIGHT }] : []),
    'blockchain.scripthash.listunspent': () => [{ tx_hash: fundingTxid, tx_pos: 0, value: 250_000_000, height: FUNDING_HEIGHT }],
    'blockchain.scripthash.subscribe': () => 'status',
    'blockchain.transaction.get': ([txid]) => {
      if (txid !== fundingTxid) throw { code: 2, message: 'unknown transaction' }
      return fundingHex
    },
    'blockchain.block.header': () => bytesToHex(header),
    'blockchain.block.headers': () => ({ count: 0, hex: '', max: 2016 }),
    'blockchain.relayfee': () => 0.000001,
    'blockchain.estimatefee': () => -1,
    'blockchain.transaction.broadcast': ([hex]) => {
      broadcasts.push(hex)
      return zcashTxid(parseZcashTx(hex))
    }
  }
  server.on('connection', (socket) => {
    socket.on('message', (raw) => {
      const msg = JSON.parse(String(raw))
      calls.push(msg.method)
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
  return { server, calls, broadcasts, balanceQueries, url, fundingTxid }
}

let btcz: ReturnType<typeof startServer>
let wrongChain: ReturnType<typeof startServer>
let ownAddress = ''
let otherAddress = ''

beforeAll(async () => {
  const own = await deriveAccountKey(MNEMONIC, 0, BTCZ_NETWORK)
  ownAddress = own.address
  otherAddress = (await deriveAccountKey(MNEMONIC, 1, BTCZ_NETWORK)).address
  const funding = bytesToHex(serializeZcashTx(fundingTx(addressToScript(ownAddress, BTCZ_NETWORK))))
  const scriptHash = addressToScriptHash(ownAddress, BTCZ_NETWORK)
  btcz = startServer(BTCZ_NETWORK.genesisHash, scriptHash, funding)
  wrongChain = startServer(RTM_NETWORK.genesisHash, scriptHash, funding)
  await Promise.all([listening(btcz.server), listening(wrongChain.server)])
})

afterAll(async () => {
  useWalletStore.getState().wipeVault()
  // Let pending persistence writes finish before localStorage is removed.
  await new Promise((resolve) => setTimeout(resolve, 50))
  btcz.server.close()
  wrongChain.server.close()
  vi.unstubAllGlobals()
})

async function until(check: () => boolean, timeoutMs = 5000): Promise<void> {
  const start = Date.now()
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error('Timed out')
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}

test('new wallets derive an RTM and a BitcoinZ address per account', async () => {
  await useWalletStore.getState().initialize('correct horse battery staple', MNEMONIC)
  const account = useWalletStore.getState().accounts[0]
  expect(account.address).toBe((await deriveAccountKey(MNEMONIC, 0)).address)
  expect(account.addresses.btcz).toBe(ownAddress)
  expect(useWalletStore.getState().network).toBe('rtm')
  const added = await useWalletStore.getState().addAccount()
  expect(added.addresses.btcz).toBe(otherAddress)
})

test('BitcoinZ connects only to BitcoinZ servers, then loads balance and history', async () => {
  useWalletStore.setState({ coinServers: { btcz: { servers: [wrongChain.url(), btcz.url()], activeServer: wrongChain.url() } } })
  useWalletStore.getState().setActiveAccount('acc-1')
  useWalletStore.getState().setNetwork('btcz')
  await until(() => useWalletStore.getState().connection === 'connected')
  await until(() => Boolean(useWalletStore.getState().activity[walletKey('btcz', 'acc-1')]))

  const state = useWalletStore.getState()
  // The RTM-genesis server is skipped; the setting moves to the server that passed.
  expect(state.coinServers.btcz.activeServer).toBe(btcz.url())
  expect(state.tipHeight).toBe(TIP)
  expect(state.assetsReady).toBe(false)
  expect(state.balances[walletKey('btcz', 'acc-1')]).toEqual({ confirmed: '250000000', unconfirmed: '0' })
  expect(state.balances['acc-1']).toBeUndefined()
  const [item] = state.activity[walletKey('btcz', 'acc-1')]
  expect(item).toMatchObject({ txid: btcz.fundingTxid, height: FUNDING_HEIGHT, rtmDelta: '250000000', timestamp: BLOCK_TIME * 1000 })
  // The RTM-only extensions are never requested from a BitcoinZ server.
  expect(btcz.calls).not.toContain('blockchain.transaction.get_in_block')
  expect(btcz.calls.some((m) => m.includes('assets'))).toBe(false)
  expect(new Set(btcz.balanceQueries)).toEqual(new Set([addressToScriptHash(ownAddress, BTCZ_NETWORK)]))
})

test('prepares, signs and broadcasts a Canopy transaction', async () => {
  const store = useWalletStore.getState()
  await expect(store.prepareCoinSend({ network: 'rtm', to: otherAddress, amount: '1' })).rejects.toThrow(/Switch MetaYoshi to Raptoreum/)
  await expect(store.prepareCoinSend({ network: 'btcz', to: (await deriveAccountKey(MNEMONIC, 0)).address, amount: '1' }))
    .rejects.toThrow(/valid BitcoinZ address/)
  await expect(store.prepareAssetSend({ assetId: 'ab'.repeat(32), to: otherAddress, amount: '1' })).rejects.toThrow(/Raptoreum/)

  const prepared = await store.prepareCoinSend({ network: 'btcz', to: otherAddress, amount: '1.5' })
  expect(prepared).toMatchObject({ kind: 'coin', network: 'btcz', symbol: 'BTCZ', from: ownAddress, to: otherAddress, amount: '1.5', fee: '0.0001' })

  const tx = parseZcashTx(prepared.hex)
  expect(tx.expiryHeight).toBe(TIP + TX_EXPIRY_DELTA)
  expect(tx.inputs).toHaveLength(1)
  expect(tx.inputs[0].txid).toBe(btcz.fundingTxid)
  expect(tx.outputs.map((o) => o.value)).toEqual([150_000_000n, 250_000_000n - 150_000_000n - 10_000n])
  const key = await deriveAccountKey(MNEMONIC, 0, BTCZ_NETWORK)
  const digest = saplingSighash(tx, 0, addressToScript(ownAddress, BTCZ_NETWORK), 250_000_000n, 1, CANOPY_BRANCH_ID)
  const sigLength = tx.inputs[0].scriptSig[0]
  const der = tx.inputs[0].scriptSig.slice(1, sigLength)
  const r = der.slice(4, 4 + der[3])
  const s = der.slice(6 + der[3])
  const pad = (n: Uint8Array) => { const out = new Uint8Array(32); out.set(n.slice(-32), 32 - Math.min(32, n.length)); return out }
  const compact = new Uint8Array([...pad(r), ...pad(s)])
  expect(secp.verify(compact, digest, key.pubkey, { prehash: false })).toBe(true)

  const txid = await store.broadcast(prepared)
  expect(txid).toBe(prepared.txid)
  expect(btcz.broadcasts).toEqual([prepared.hex])
  expect(useWalletStore.getState().sent[0]).toMatchObject({ txid, network: 'btcz', amount: '1.5' })
})

test('a transaction prepared on one network cannot be broadcast on another', async () => {
  const prepared = await useWalletStore.getState().prepareCoinSend({ network: 'btcz', to: otherAddress, amount: '0.5' })
  // The mock with the Raptoreum genesis stands in for an RTM server.
  useWalletStore.setState({ servers: [wrongChain.url()], activeServer: wrongChain.url() })
  useWalletStore.getState().setNetwork('rtm')
  await until(() => useWalletStore.getState().connection === 'connected')
  await expect(useWalletStore.getState().broadcast(prepared)).rejects.toThrow(/This transaction is for BitcoinZ/)
  expect(btcz.broadcasts).toHaveLength(1)
  expect(wrongChain.broadcasts).toHaveLength(0)
  // The RTM session queried the RTM address, not the BitcoinZ one.
  await until(() => wrongChain.balanceQueries.length > 0)
  expect(wrongChain.balanceQueries).not.toContain(addressToScriptHash(ownAddress, BTCZ_NETWORK))
})

test('network choice and BitcoinZ servers persist; old state defaults to RTM', async () => {
  const { WALLET_STORAGE_KEY } = await import('../lib/walletStorage')
  memory.set(WALLET_STORAGE_KEY, JSON.stringify({ version: 2, state: { servers: ['wss://custom.example:50004'] } }))
  await useWalletStore.persist.rehydrate()
  let state = useWalletStore.getState()
  expect(state.network).toBe('rtm')
  expect(state.enabledNetworks).toEqual(['rtm', 'btcz', 'ltc', 'btc', 'doge'])
  expect(serverStateOf(state, 'btcz')).toEqual({
    servers: ['wss://electrum1.btcz.rocks:50004', 'wss://electrum2.btcz.rocks:50004', 'wss://electrum6.btcz.rocks:50004'],
    activeServer: 'wss://electrum1.btcz.rocks:50004'
  })

  memory.set(WALLET_STORAGE_KEY, JSON.stringify({ version: 2, state: {
    network: 'btcz', btczServers: ['wss://mine.example:50004'], btczActiveServer: 'wss://gone.example:50004',
    accounts: [{ id: 'acc-1', name: 'A', derivationIndex: 0, address: '', btczAddress: 'not-an-address' }]
  } }))
  await useWalletStore.persist.rehydrate()
  state = useWalletStore.getState()
  expect(state.network).toBe('btcz')
  // Fields saved by the BitcoinZ-only release are migrated.
  expect(state.coinServers.btcz).toEqual({ servers: ['wss://mine.example:50004'], activeServer: 'wss://mine.example:50004' })
  expect(state.accounts[0].addresses).toEqual({})
})
