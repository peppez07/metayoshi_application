import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { WebSocketServer, type WebSocket as ServerSocket } from 'ws'
import { ElectrumClient, ElectrumError } from '../client'
import { RTM_GENESIS_HASH, RtmElectrum } from '../rtmElectrum'
import { addressToScriptHash } from '../../rtm/address'

const ADDRESS = 'RDjNvZL1TJQ7R8L23jDutdEioQG4eTC38V'
const ASSET = 'ab'.repeat(32)

function listening(server: WebSocketServer): Promise<void> {
  return server.address() ? Promise.resolve() : new Promise((resolve) => server.once('listening', () => resolve()))
}

/** Minimal ElectrumX stand-in speaking JSON-RPC over WebSocket frames. */
function startMockServer(genesis = RTM_GENESIS_HASH, inBlock = true) {
  const server = new WebSocketServer({ port: 0 })
  const calls: string[] = []
  let retriesLeft = 2
  const handlers: Record<string, (params: any[], socket: ServerSocket) => unknown> = {
    'server.version': () => ['ElectrumX 1.16.0', '1.4'],
    'server.features': () => ({ genesis_hash: genesis, server_version: 'ElectrumX 1.16.0', rtm_assets: { ready: true, indexed_height: 100 } }),
    'blockchain.headers.subscribe': () => ({ height: 100, hex: '00'.repeat(80) }),
    'blockchain.scripthash.get_balance': ([sh]) => {
      expect(sh).toBe(addressToScriptHash(ADDRESS))
      if (retriesLeft-- > 0) throw { code: -32001, message: 'asset mempool is synchronizing; retry' }
      return { confirmed: 1234567890, unconfirmed: -5 }
    },
    'blockchain.scripthash.listunspent': () => [{ tx_hash: 'aa'.repeat(32), tx_pos: 1, value: 500000000, height: 90 }],
    'blockchain.transaction.get': ([txid]) => `plain:${txid}`,
    ...(inBlock ? { 'blockchain.transaction.get_in_block': ([txid, height]: any[]) => `block${height}:${txid}` } : {}),
    'blockchain.relayfee': () => 0.00001,
    'blockchain.estimatefee': () => 0.00005,
    'blockchain.scripthash.assets.listunspent': ([, assetId, cursor]) => {
      expect(assetId).toBe(ASSET)
      const item = (n: number) => ({
        asset_id: ASSET, amount: String(n * 100000000), tx_hash: String(n).repeat(64).slice(0, 64), tx_pos: 0,
        height: 50, is_unique: false, unique_id: null, script: '76a914' + '11'.repeat(20) + '88ac', spendable: true
      })
      return cursor ? { items: [item(2)], cursor: null } : { items: [item(1)], cursor: 'next-page' }
    },
    'blockchain.scripthash.subscribe': ([sh], socket) => {
      setTimeout(() => socket.send(JSON.stringify({ jsonrpc: '2.0', method: 'blockchain.scripthash.subscribe', params: [sh, 'newstatus'] })), 10)
      return 'status'
    }
  }
  server.on('connection', (socket) => {
    socket.on('message', (raw) => {
      const msg = JSON.parse(String(raw))
      calls.push(msg.method)
      const handler = handlers[msg.method]
      try {
        if (!handler) throw { code: -32601, message: `unknown method ${msg.method}` }
        socket.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: handler(msg.params, socket) }))
      } catch (error: any) {
        socket.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error }))
      }
    })
  })
  const url = () => `ws://127.0.0.1:${(server.address() as { port: number }).port}`
  return { server, calls, url }
}

describe('ElectrumX client', () => {
  const mock = startMockServer()
  let api: RtmElectrum

  beforeAll(async () => {
    await listening(mock.server)
    api = new RtmElectrum(new ElectrumClient(mock.url()))
  })

  afterAll(() => {
    api.client.close()
    mock.server.close()
  })

  test('negotiates the protocol and verifies the Raptoreum genesis hash', async () => {
    const features = await api.verifyNetwork()
    expect(features.assetsReady).toBe(true)
    expect(mock.calls[0]).toBe('server.version')
  })

  test('retries transient asset-index errors and returns BigInt balances', async () => {
    const balance = await api.balance(ADDRESS)
    expect(balance).toEqual({ confirmed: 1234567890n, unconfirmed: -5n })
    expect(mock.calls.filter((m) => m === 'blockchain.scripthash.get_balance')).toHaveLength(3)
  })

  test('maps unspent outputs and fee rates', async () => {
    expect(await api.listUnspent(ADDRESS)).toEqual([{ txid: 'aa'.repeat(32), vout: 1, value: 500000000n, height: 90 }])
    // 0.00005 RTM/kB = 5 sat/byte, above relay fee and the 2 sat/byte floor
    expect(await api.feePerByte()).toBe(5n)
  })

  test('follows asset cursors across pages', async () => {
    const utxos = await api.assetUnspent(ADDRESS, ASSET)
    expect(utxos.map((u) => u.amount)).toEqual([100000000n, 200000000n])
  })

  test('delivers subscription notifications', async () => {
    const seen = new Promise<string | null>((resolve) => api.onAddressChange((_sh, status) => resolve(status)))
    await api.subscribeAddress(ADDRESS)
    expect(await seen).toBe('newstatus')
  })

  test('reads confirmed transactions from their block and mempool ones directly', async () => {
    expect(await api.getTransactionAt('ee'.repeat(32), 77)).toBe(`block77:${'ee'.repeat(32)}`)
    expect(await api.getTransactionAt('ee'.repeat(32), 0)).toBe(`plain:${'ee'.repeat(32)}`)
  })

  test('surfaces server errors', async () => {
    await expect(api.client.request('no.such.method')).rejects.toBeInstanceOf(ElectrumError)
  })
})

describe('network verification', () => {
  test('rejects servers for another chain', async () => {
    const mock = startMockServer('00'.repeat(32))
    await listening(mock.server)
    const api = new RtmElectrum(new ElectrumClient(mock.url()))
    await expect(api.verifyNetwork()).rejects.toThrow(/genesis hash mismatch/)
    api.client.close()
    mock.server.close()
  })
})

describe('servers without the get_in_block extension', () => {
  test('fall back to blockchain.transaction.get', async () => {
    const mock = startMockServer(RTM_GENESIS_HASH, false)
    await listening(mock.server)
    const api = new RtmElectrum(new ElectrumClient(mock.url()))
    expect(await api.getTransactionAt('ee'.repeat(32), 77)).toBe(`plain:${'ee'.repeat(32)}`)
    expect(await api.getTransactionAt('ff'.repeat(32), 78)).toBe(`plain:${'ff'.repeat(32)}`)
    expect(mock.calls.filter((m) => m === 'blockchain.transaction.get_in_block')).toHaveLength(1)
    api.client.close()
    mock.server.close()
  })
})
