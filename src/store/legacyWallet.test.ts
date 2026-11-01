import { afterAll, beforeAll, expect, test, vi } from 'vitest'
import { WebSocketServer } from 'ws'
import { NETWORKS } from '../lib/networks'
import { addressToScript, addressToScriptHash, deriveAccountKey } from '../lib/rtm/address'
import { bytesToHex, concatBytes, hexToBytes, reverseBytes, sha256d, u32LE, u64LE, varBytes, compactSize } from '../lib/rtm/bytes'
import { encodeSegwitAddress } from '../lib/coins/bech32'
import { parseLegacyTx } from '../lib/coins/legacy'
import { estimateTxBytes } from '../lib/rtm/transaction'
import { formatUnits } from '../lib/rtm/amount'

const memory = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => memory.set(key, value),
  removeItem: (key: string) => memory.delete(key)
})
const { serverStateOf, useWalletStore, walletKey } = await import('./walletStore')

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const LTC = NETWORKS.ltc
const TIP = 2_900_000

function listening(server: WebSocketServer): Promise<void> {
  return server.address() ? Promise.resolve() : new Promise((resolve) => server.once('listening', () => resolve()))
}

/** A SegWit-serialized funding transaction paying `script`; its txid excludes the witness. */
function fundingTx(script: Uint8Array): { hex: string; txid: string } {
  const input = concatBytes(new Uint8Array(32).fill(0x33), u32LE(0), varBytes(new Uint8Array()), u32LE(0xffffffff))
  const output = concatBytes(u64LE(80_000_000n), varBytes(script))
  const body = concatBytes(compactSize(1), input, compactSize(1), output)
  const witness = concatBytes(compactSize(1), varBytes(new Uint8Array(71).fill(1)))
  const hex = bytesToHex(concatBytes(u32LE(2), Uint8Array.of(0, 1), body, witness, u32LE(0)))
  const txid = bytesToHex(reverseBytes(sha256d(concatBytes(u32LE(2), body, u32LE(0)))))
  return { hex, txid }
}

function startServer(genesis: string, ownScriptHash: string, funding: { hex: string; txid: string }) {
  const server = new WebSocketServer({ port: 0 })
  const calls: string[] = []
  const broadcasts: string[] = []
  const header = new Uint8Array(80)
  new DataView(header.buffer).setUint32(68, 1_760_000_000, true)
  const handlers: Record<string, (params: any[]) => unknown> = {
    'server.version': () => ['ElectrumX 1.16.0', '1.4'],
    'server.features': () => ({ genesis_hash: genesis, server_version: 'ElectrumX 1.16.0' }),
    'blockchain.headers.subscribe': () => ({ height: TIP, hex: '' }),
    'blockchain.scripthash.get_balance': ([sh]) => (sh === ownScriptHash ? { confirmed: 80_000_000, unconfirmed: 0 } : { confirmed: 0, unconfirmed: 0 }),
    'blockchain.scripthash.get_history': ([sh]) => (sh === ownScriptHash ? [{ tx_hash: funding.txid, height: TIP - 10 }] : []),
    'blockchain.scripthash.listunspent': ([sh]) => (sh === ownScriptHash ? [{ tx_hash: funding.txid, tx_pos: 0, value: 80_000_000, height: TIP - 10 }] : []),
    'blockchain.scripthash.subscribe': () => 'status',
    'blockchain.transaction.get': ([txid]) => {
      if (txid !== funding.txid) throw { code: 2, message: 'unknown transaction' }
      return funding.hex
    },
    'blockchain.block.header': () => bytesToHex(header),
    // 0.0001 LTC/kB relay (10 lit/byte), 0.0002 LTC/kB estimate.
    'blockchain.relayfee': () => 0.0001,
    'blockchain.estimatefee': () => 0.0002,
    'blockchain.transaction.broadcast': ([hex]) => {
      broadcasts.push(hex)
      const tx = hexToBytes(hex)
      return bytesToHex(reverseBytes(sha256d(tx)))
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
  return { server, calls, broadcasts, url }
}

let ltc: ReturnType<typeof startServer>
let btcChain: ReturnType<typeof startServer>
let ownAddress = ''
let funding: { hex: string; txid: string }

beforeAll(async () => {
  ownAddress = (await deriveAccountKey(MNEMONIC, 0, LTC)).address
  funding = fundingTx(addressToScript(ownAddress, LTC))
  const scriptHash = addressToScriptHash(ownAddress, LTC)
  ltc = startServer(LTC.genesisHash, scriptHash, funding)
  btcChain = startServer(NETWORKS.btc.genesisHash, scriptHash, funding)
  await Promise.all([listening(ltc.server), listening(btcChain.server)])
  await useWalletStore.getState().initialize('correct horse battery staple', MNEMONIC)
})

afterAll(async () => {
  useWalletStore.getState().wipeVault()
  await new Promise((resolve) => setTimeout(resolve, 50))
  ltc.server.close()
  btcChain.server.close()
  vi.unstubAllGlobals()
})

async function until(check: () => boolean, timeoutMs = 5000): Promise<void> {
  const start = Date.now()
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error('Timed out')
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}

test('Litecoin is on by default with its address derived and its public servers set', async () => {
  const state = useWalletStore.getState()
  expect(state.enabledNetworks).toEqual(['rtm', 'btcz', 'ltc', 'btc', 'doge'])
  expect(state.accounts[0].addresses.ltc).toBe('LUWPbpM43E2p7ZSh8cyTBEkvpHmr3cB8Ez')
  expect(serverStateOf(state, 'ltc')).toEqual({
    servers: ['wss://electrum1.cipig.net:30063', 'wss://electrum2.cipig.net:30063'],
    activeServer: 'wss://electrum1.cipig.net:30063'
  })
  // New accounts derive every enabled coin.
  const added = await useWalletStore.getState().addAccount()
  expect(Object.keys(added.addresses).sort()).toEqual(['btc', 'btcz', 'doge', 'ltc'])
})

test('other coins must be enabled before they can be selected', async () => {
  useWalletStore.getState().setNetwork('dash')
  expect(useWalletStore.getState().network).toBe('rtm')
  await useWalletStore.getState().enableNetwork('dash')
  expect(useWalletStore.getState().enabledNetworks).toEqual(['rtm', 'btcz', 'ltc', 'btc', 'doge', 'dash'])
  expect(useWalletStore.getState().accounts[0].addresses.dash).toBe((await deriveAccountKey(MNEMONIC, 0, NETWORKS.dash)).address)
  useWalletStore.getState().disableNetwork('dash')
})

test('connects to a Litecoin server, reads SegWit history and sends to a bech32 address', async () => {
  useWalletStore.setState({ coinServers: { ltc: { servers: [btcChain.url(), ltc.url()], activeServer: btcChain.url() } } })
  useWalletStore.getState().setActiveAccount('acc-1')
  useWalletStore.getState().setNetwork('ltc')
  await until(() => useWalletStore.getState().connection === 'connected')
  await until(() => Boolean(useWalletStore.getState().activity[walletKey('ltc', 'acc-1')]))

  const state = useWalletStore.getState()
  expect(state.coinServers.ltc.activeServer).toBe(ltc.url())
  expect(state.balances[walletKey('ltc', 'acc-1')]).toEqual({ confirmed: '80000000', unconfirmed: '0' })
  expect(state.activity[walletKey('ltc', 'acc-1')][0]).toMatchObject({ txid: funding.txid, rtmDelta: '80000000', timestamp: 1_760_000_000_000 })
  expect(ltc.calls).not.toContain('blockchain.transaction.get_in_block')

  const to = encodeSegwitAddress('ltc', 0, hexToBytes('751e76e8199196d454941c45d1b3a323f1433bd6'))
  const prepared = await useWalletStore.getState().prepareCoinSend({ network: 'ltc', to, amount: '0.5' })
  expect(prepared).toMatchObject({ network: 'ltc', symbol: 'LTC', amount: '0.5' })
  const tx = parseLegacyTx(prepared.hex)
  expect(tx.version).toBe(1)
  expect(tx.inputs[0].txid).toBe(funding.txid)
  expect(bytesToHex(tx.outputs[0].script)).toBe('0014751e76e8199196d454941c45d1b3a323f1433bd6')
  // 20 lit/byte from the 6-block estimate (above the relay fee), on the size estimate; change keeps the rest.
  const fee = BigInt(estimateTxBytes(1, [tx.outputs[0].script, addressToScript(ownAddress, LTC)])) * 20n
  expect(prepared.fee).toBe(formatUnits(fee, 8))
  expect(tx.outputs[1].value).toBe(80_000_000n - 50_000_000n - fee)
  expect(prepared.size).toBeLessThanOrEqual(estimateTxBytes(1, [tx.outputs[0].script, addressToScript(ownAddress, LTC)]))

  // Amounts at or below the relay-fee dust limit (3 x 10 lit/byte x 182 = 5460) are refused.
  await expect(useWalletStore.getState().prepareCoinSend({ network: 'ltc', to, amount: '0.0000546' })).rejects.toThrow(/dust/)

  expect(await useWalletStore.getState().broadcast(prepared)).toBe(prepared.txid)
  expect(ltc.broadcasts).toEqual([prepared.hex])
})

test('removing a coin hides it and switches back to Raptoreum', () => {
  useWalletStore.setState({ servers: [btcChain.url()], activeServer: btcChain.url() })
  useWalletStore.getState().disableNetwork('ltc')
  const state = useWalletStore.getState()
  expect(state.network).toBe('rtm')
  expect(state.enabledNetworks).toEqual(['rtm', 'btcz', 'btc', 'doge'])
  // The address stays derived, so re-enabling is instant and nothing is lost.
  expect(state.accounts[0].addresses.ltc).toBe('LUWPbpM43E2p7ZSh8cyTBEkvpHmr3cB8Ez')
})

test('a removed default coin stays removed after a reload', async () => {
  await new Promise((resolve) => setTimeout(resolve, 50))
  await useWalletStore.persist.rehydrate()
  expect(useWalletStore.getState().enabledNetworks).toEqual(['rtm', 'btcz', 'btc', 'doge'])
})

test('wallets saved before Litecoin, Bitcoin and Dogecoin were defaults get each new default once', async () => {
  const { WALLET_STORAGE_KEY } = await import('../lib/walletStorage')
  memory.set(WALLET_STORAGE_KEY, JSON.stringify({ version: 2, state: { enabledNetworks: ['rtm', 'btcz', 'dash'] } }))
  await useWalletStore.persist.rehydrate()
  expect(useWalletStore.getState().enabledNetworks).toEqual(['rtm', 'btcz', 'dash', 'ltc', 'btc', 'doge'])
  expect(useWalletStore.getState().offeredNetworks).toEqual(['rtm', 'btcz', 'ltc', 'btc', 'doge'])

  // A wallet that already had Litecoin and Bitcoin offered, and removed Litecoin, gets only Dogecoin.
  memory.set(WALLET_STORAGE_KEY, JSON.stringify({ version: 2, state: { enabledNetworks: ['rtm', 'btcz', 'btc'], offeredNetworks: ['rtm', 'btcz', 'ltc', 'btc'] } }))
  await useWalletStore.persist.rehydrate()
  expect(useWalletStore.getState().enabledNetworks).toEqual(['rtm', 'btcz', 'btc', 'doge'])
})
