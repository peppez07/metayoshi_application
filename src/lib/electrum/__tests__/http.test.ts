import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { ElectrumClient, ElectrumError, parseJson } from '../client'
import { toAtoms } from '../../rtm/amount'
import { isValidServerUrl, RtmElectrum, RTM_GENESIS_HASH } from '../rtmElectrum'

type Rpc = { id: number; method: string; params: unknown[] }
const cleanup: Array<() => void> = []
afterEach(() => { cleanup.splice(0).forEach((stop) => stop()); vi.useRealTimers() })

async function gateway(handler: (rpc: Rpc, req: IncomingMessage, res: ServerResponse) => unknown, negotiate = true) {
  const calls: Rpc[] = []
  const sessions: unknown[] = []
  const server = createServer(async (req, res) => {
    let body = ''
    for await (const chunk of req) body += chunk
    if (!body) { res.writeHead(400); res.end(); return }
    const rpc = JSON.parse(body) as Rpc
    calls.push(rpc)
    sessions.push(req.headers['x-electrum-session'])
    expect(req.method).toBe('POST')
    expect(req.url).toBe('/api/v1/electrum')
    expect(req.headers.cookie).toBeUndefined()
    const result = rpc.method === 'server.version' && negotiate ? ['test-server', '1.4'] : await handler(rpc, req, res)
    if (!res.writableEnded && !res.destroyed) {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, result }))
    }
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  cleanup.push(() => { server.closeAllConnections(); server.close() })
  const client = new ElectrumClient(`http://127.0.0.1:${(server.address() as { port: number }).port}/api/v1/electrum`)
  cleanup.push(() => client.close())
  return { client, calls, sessions, server }
}

describe('parseJson', () => {
  test('keeps amounts above 2^53 base units exact and leaves everything else as JSON.parse does', () => {
    const text = '{"confirmed":250214227465667123,"unconfirmed":-9007199254740993,"small":42,"fee":0.01003029,"exp":1e21,' +
      '"note":"x:12345678901234567890,\\"q\\"","list":[9007199254740991,9007199254740992]}'
    expect(parseJson(text)).toEqual({
      confirmed: '250214227465667123', unconfirmed: '-9007199254740993', small: 42, fee: 0.01003029, exp: 1e21,
      note: 'x:12345678901234567890,"q"', list: [9007199254740991, '9007199254740992']
    })
    expect(toAtoms(parseJson('{"v":250214227465667123}').v)).toBe(250214227465667123n)
  })
})

describe('HTTP Electrum transport', () => {
  test('negotiates once for concurrent requests, verifies mainnet and keeps cursor requests in one session', async () => {
    const mock = await gateway(({ method, params }) => {
      if (method === 'server.features') return { genesis_hash: RTM_GENESIS_HASH, rtm_assets: { ready: true } }
      if (method === 'blockchain.scripthash.get_balance') return { confirmed: 42, unconfirmed: 0 }
      if (method === 'page') return params[0] ? { items: [2], cursor: null } : { items: [1], cursor: 'next' }
      return null
    })
    const api = new RtmElectrum(mock.client)
    const [features, balance] = await Promise.all([api.verifyNetwork(), mock.client.request('blockchain.scripthash.get_balance', ['hash'])])
    expect(features.assetsReady).toBe(true)
    expect(balance).toEqual({ confirmed: 42, unconfirmed: 0 })
    expect(await mock.client.request('page')).toEqual({ items: [1], cursor: 'next' })
    expect(await mock.client.request('page', ['next'])).toEqual({ items: [2], cursor: null })
    expect(mock.calls.filter((rpc) => rpc.method === 'server.version')).toHaveLength(1)
    expect(new Set(mock.sessions).size).toBe(1)
    expect(mock.sessions[0]).toMatch(/^(?:[0-9a-f]{32}|[0-9a-f-]{36})$/)
    expect(mock.client.state).toBe('connected')
  })

  test('rejects a wrong chain over HTTP', async () => {
    const { client } = await gateway(() => ({ genesis_hash: '00'.repeat(32) }))
    await expect(new RtmElectrum(client).verifyNetwork()).rejects.toThrow(/genesis hash mismatch/)
  })

  test('starts a fresh upstream session when reconnecting because server.version is single-use', async () => {
    const handshakes = new Set<unknown>()
    const { client, sessions } = await gateway((rpc, req, res) => {
      if (rpc.method !== 'server.version') return 42
      const token = req.headers['x-electrum-session']
      if (handshakes.has(token)) {
        res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, error: { code: 1, message: 'server.version already sent' } }))
        return
      }
      handshakes.add(token)
      return ['test-server', '1.4']
    }, false)
    expect(await client.request('answer')).toBe(42)
    client.close()
    expect(await client.request('answer')).toBe(42)
    expect(new Set(sessions).size).toBe(2)
  })

  test('validates response IDs instead of trusting another request result', async () => {
    const { client } = await gateway((rpc, _req, res) => res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id + 1, result: 'wrong' })))
    await expect(client.request('balance')).rejects.toThrow(/response|ID/i)
  })

  test('reports a safe synchronizing error and never retries a broadcast', async () => {
    const raw = 'deadbeef'.repeat(50)
    const { client, calls } = await gateway((rpc, _req, res) => res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, error: { code: -32001, message: `retry ${raw}` } })))
    const error = await client.request('blockchain.transaction.broadcast', [raw]).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ElectrumError)
    expect(error).toMatchObject({ code: -32001 })
    expect((error as Error).message).toMatch(/synchroniz/i)
    expect((error as Error).message).not.toContain(raw)
    expect(calls.filter((rpc) => rpc.method === 'blockchain.transaction.broadcast')).toHaveLength(1)
  })

  test('shows the node\'s reason when it rejects a broadcast, without the raw transaction', async () => {
    const raw = 'deadbeef'.repeat(50)
    const { client, calls } = await gateway((rpc, _req, res) => res.end(JSON.stringify({
      jsonrpc: '2.0', id: rpc.id, error: { code: 1, message: `the transaction was rejected by network rules.\n\nmin relay fee not met, 100 < 226\n[${raw}]` }
    })))
    const error = await client.request('blockchain.transaction.broadcast', [raw]).catch((e: unknown) => e)
    expect(error).toMatchObject({ code: 1, message: 'The network rejected this transaction: min relay fee not met, 100 < 226' })
    expect(calls.filter((rpc) => rpc.method === 'blockchain.transaction.broadcast')).toHaveLength(1)
  })

  test('keeps the cautious message when a broadcast\'s outcome is unknown', async () => {
    const { client } = await gateway((_rpc, req) => { req.socket.destroy() })
    const error = await client.request('blockchain.transaction.broadcast', ['signed']).catch((e: unknown) => e)
    expect((error as Error).message).toMatch(/not confirmed\. Check its status/)
  })

  test('identifies an indexing server during the initial handshake', async () => {
    const { client, calls } = await gateway((rpc, _req, res) => res.end(JSON.stringify({
      jsonrpc: '2.0', id: rpc.id, error: { code: -32001, message: 'private upstream failure details' }
    })), false)
    await expect(client.connect()).rejects.toMatchObject({ code: -32001, message: expect.stringMatching(/synchronizing/) })
    expect(client.state).toBe('closed')
    expect(calls).toHaveLength(1)
  })

  test('retries a transient read error over HTTP', async () => {
    let attempts = 0
    const { client, calls } = await gateway((rpc, _req, res) => {
      if (++attempts === 1) {
        res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, error: { code: -32001, message: 'retry' } }))
        return
      }
      return { confirmed: 42, unconfirmed: 0 }
    })
    await expect(client.request('blockchain.scripthash.get_balance', ['hash'])).resolves.toEqual({ confirmed: 42, unconfirmed: 0 })
    expect(calls.filter((rpc) => rpc.method === 'blockchain.scripthash.get_balance')).toHaveLength(2)
  })

  test.each([null, 'matching'])('retries an HTTP 503 capacity error with response ID %s', async (responseId) => {
    let attempts = 0
    const { client, calls } = await gateway((rpc, _req, res) => {
      if (++attempts === 1) {
        res.writeHead(503, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ jsonrpc: '2.0', id: responseId === null ? null : rpc.id,
          error: { code: -32001, message: 'Gateway session capacity reached. Please wait.' } }))
        return
      }
      return 42
    })
    await expect(client.request('blockchain.scripthash.get_balance', ['hash'])).resolves.toBe(42)
    expect(calls.filter((rpc) => rpc.method === 'blockchain.scripthash.get_balance')).toHaveLength(2)
  })

  test('maps HTTP 503 broadcast errors to a safe retry code without another submission', async () => {
    const raw = 'deadbeef'.repeat(50)
    const { client, calls } = await gateway((_rpc, _req, res) => {
      res.writeHead(503, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32001, message: raw } }))
    })
    const error = await client.request('blockchain.transaction.broadcast', [raw]).catch((e: unknown) => e)
    expect(error).toMatchObject({ code: -32001, message: expect.stringMatching(/synchronizing/) })
    expect((error as Error).message).not.toContain(raw)
    expect(calls.filter((rpc) => rpc.method === 'blockchain.transaction.broadcast')).toHaveLength(1)
  })

  test('does not follow redirects that could forward signed transactions', async () => {
    const { client, calls } = await gateway((_rpc, _req, res) => { res.writeHead(307, { Location: '/elsewhere' }); res.end() })
    await expect(client.request('blockchain.transaction.broadcast', ['signed'])).rejects.toThrow()
    expect(calls).toHaveLength(2)
  })

  test('close aborts an in-flight request and stale results cannot reconnect it', async () => {
    let release!: () => void
    const { client, calls } = await gateway(async () => { await new Promise<void>((resolve) => { release = resolve }); return 'late' })
    await client.connect()
    const pending = client.request('slow').catch((error: unknown) => error)
    await vi.waitFor(() => expect(calls).toHaveLength(2))
    client.close()
    expect(await pending).toBeInstanceOf(ElectrumError)
    release()
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(client.state).toBe('closed')
  })

  test('close aborts a pending handshake shared by concurrent requests', async () => {
    let release!: () => void
    const { client, calls } = await gateway(async () => {
      await new Promise<void>((resolve) => { release = resolve })
      return ['late', '1.4']
    }, false)
    const first = client.request('first').catch((error: unknown) => error)
    const second = client.request('second').catch((error: unknown) => error)
    await vi.waitFor(() => expect(calls).toHaveLength(1))
    client.close()
    expect(await first).toBeInstanceOf(ElectrumError)
    expect(await second).toBeInstanceOf(ElectrumError)
    release()
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(calls).toHaveLength(1)
    expect(client.state).toBe('closed')
  })

  test('bounds a stalled request with an abort timeout', async () => {
    let began!: () => void
    let release!: () => void
    const started = new Promise<void>((resolve) => { began = resolve })
    const { client } = await gateway(async () => {
      began()
      await new Promise<void>((resolve) => { release = resolve })
      return null
    })
    await client.connect()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const pending = client.request('slow').catch((error: unknown) => error)
    await started
    await vi.advanceTimersByTimeAsync(20_000)
    expect(await pending).toMatchObject({ message: expect.stringMatching(/timed out/) })
    release()
  })

  test('uses HTTP for case-insensitive URL schemes', async () => {
    const { client } = await gateway(() => 42)
    const uppercase = new ElectrumClient(client.url.replace('http:', 'HTTP:'))
    cleanup.push(() => uppercase.close())
    expect(await uppercase.request('answer')).toBe(42)
  })

  test('polls header, address and asset subscriptions only emitting changed values, and stops on close', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    let height = 100
    let status = 'old'
    const { client, calls } = await gateway(({ method }) => method === 'blockchain.headers.subscribe' ? { height, hex: '00' } : status)
    const seen: unknown[][] = []
    for (const method of ['blockchain.headers.subscribe', 'blockchain.scripthash.subscribe', 'blockchain.scripthash.assets.subscribe']) {
      client.on(method, (params) => seen.push(params))
      await client.request(method, method.includes('scripthash') ? ['hash'] : [])
    }
    await vi.advanceTimersByTimeAsync(15_000)
    await vi.waitFor(() => expect(calls).toHaveLength(7))
    expect(seen).toEqual([])
    height = 101
    status = 'new'
    await vi.advanceTimersByTimeAsync(15_000)
    await vi.waitFor(() => expect(seen).toHaveLength(3))
    expect(seen).toContainEqual([{ height: 101, hex: '00' }])
    expect(seen.filter((params) => params[0] === 'hash')).toEqual([['hash', 'new'], ['hash', 'new']])
    client.close()
    const count = calls.length
    await vi.advanceTimersByTimeAsync(30_000)
    expect(calls).toHaveLength(count)
  })
})

describe('server URL validation', () => {
  test.each(['https://node.example/api/v1/electrum', 'http://127.0.0.1:8090/api/v1/electrum', 'wss://node.example:50004', 'ws://127.0.0.1:50003'])('accepts explicit supported transport %s', (url) => {
    expect(isValidServerUrl(url)).toBe(true)
  })
  test.each(['https://user:secret@node.example/api', 'wss://user@node.example', 'https://node.example/api#fragment', 'https://node.example/api#', 'ftp://node.example', 'javascript:alert(1)', 'not a URL'])('rejects unsafe URL %s before connecting', (url) => {
    expect(isValidServerUrl(url)).toBe(false)
    expect(() => new ElectrumClient(url)).toThrow()
  })
})
