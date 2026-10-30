import { describe, expect, test } from 'vitest'
import {
  connectionCandidates, crossCheck, fetchPeers, isDiscoverableUrl, mergePeers, parsePeerList,
  PEER_MAX_AGE_MS, serversEndpoint, type DiscoveredServer
} from '../discovery'
import { RTM_GENESIS_HASH, type RtmElectrum } from '../rtmElectrum'

const peer = (url: string, seenAt: number, extra: Partial<DiscoveredServer> = {}): DiscoveredServer =>
  ({ url, height: 100, assetsReady: true, smartnode: true, seenAt, ...extra })

describe('server discovery', () => {
  test('derives the servers endpoint only for HTTPS gateways', () => {
    expect(serversEndpoint('https://144.202.18.233/api/v1/electrum')).toBe('https://144.202.18.233/api/v1/servers')
    expect(serversEndpoint('wss://host:50004')).toBeNull()
    expect(serversEndpoint('https://host/other')).toBeNull()
  })

  test('accepts only plain https gateway URLs from other servers', () => {
    expect(isDiscoverableUrl('https://8.8.8.8/api/v1/electrum')).toBe(true)
    expect(isDiscoverableUrl('https://node.example/api/v1/electrum')).toBe(true)
    for (const url of ['http://8.8.8.8/api/v1/electrum', 'https://8.8.8.8:444/api/v1/electrum',
      'https://8.8.8.8/api/v1/electrum?x=1', 'https://u:p@8.8.8.8/api/v1/electrum', 'wss://8.8.8.8:50004',
      'https://8.8.8.8/api/v1/electrum#x', 'javascript:alert(1)']) {
      expect(isDiscoverableUrl(url), url).toBe(false)
    }
  })

  test('parses, filters and caps peer lists', () => {
    const list = parsePeerList({
      servers: [
        { url: 'https://8.8.8.8/api/v1/electrum', height: 5, assets_ready: true, smartnode: true },
        { url: 'https://evil/api/v1/electrum?steal=1', height: 5 },
        { url: 'https://1.1.1.1/api/v1/electrum', height: -1 },
        { url: 'https://9.9.9.9/api/v1/electrum', height: 7 }
      ]
    }, 1)
    expect(list).toEqual([
      { url: 'https://8.8.8.8/api/v1/electrum', height: 5, assetsReady: true, smartnode: true, seenAt: 1 },
      { url: 'https://9.9.9.9/api/v1/electrum', height: 7, assetsReady: false, smartnode: false, seenAt: 1 }
    ])
    expect(parsePeerList({ servers: 'x' }, 1)).toEqual([])
  })

  test('fetches without credentials or redirects and tolerates failures', async () => {
    const seen: Array<[string, RequestInit | undefined]> = []
    const ok = (async (url: string, init?: RequestInit) => {
      seen.push([url, init])
      return new Response(JSON.stringify({ servers: [{ url: 'https://8.8.8.8/api/v1/electrum', height: 3, assets_ready: true }] }))
    }) as typeof fetch
    const peers = await fetchPeers('https://144.202.18.233/api/v1/electrum', ok)
    expect(peers.map((p) => p.url)).toEqual(['https://8.8.8.8/api/v1/electrum'])
    expect(seen[0][0]).toBe('https://144.202.18.233/api/v1/servers')
    expect(seen[0][1]).toMatchObject({ credentials: 'omit', redirect: 'error' })

    const failing = (async () => { throw new TypeError('offline') }) as typeof fetch
    expect(await fetchPeers('https://144.202.18.233/api/v1/electrum', failing)).toEqual([])
    const notJson = (async () => new Response('<html>')) as typeof fetch
    expect(await fetchPeers('https://144.202.18.233/api/v1/electrum', notJson)).toEqual([])
    expect(await fetchPeers('wss://host:50004', ok)).toEqual([])
  })

  test('merges newest sightings and expires old ones', () => {
    const now = PEER_MAX_AGE_MS * 2
    const merged = mergePeers(
      [peer('https://8.8.8.8/api/v1/electrum', now - 10, { height: 1 }), peer('https://1.1.1.1/api/v1/electrum', now - PEER_MAX_AGE_MS - 1)],
      [peer('https://8.8.8.8/api/v1/electrum', now, { height: 2 }), peer('http://bad/api/v1/electrum', now)],
      now)
    expect(merged).toEqual([peer('https://8.8.8.8/api/v1/electrum', now, { height: 2 })])
  })

  test('orders candidates: active, configured, then ready discovered servers', () => {
    const candidates = connectionCandidates('https://a/api/v1/electrum', ['https://a/api/v1/electrum', 'wss://b:50004'], [
      peer('https://old/api/v1/electrum', 1),
      peer('https://new/api/v1/electrum', 5),
      peer('https://syncing/api/v1/electrum', 9, { assetsReady: false })
    ])
    expect(candidates).toEqual(['https://a/api/v1/electrum', 'wss://b:50004', 'https://new/api/v1/electrum', 'https://old/api/v1/electrum'])
  })
})

describe('chain cross-check', () => {
  const fake = (tip: number, header: (h: number) => string, opts: { genesis?: string; fail?: boolean } = {}) => ({
    client: { close: () => undefined },
    verifyNetwork: async () => {
      if (opts.fail) throw new Error('offline')
      if ((opts.genesis ?? RTM_GENESIS_HASH) !== RTM_GENESIS_HASH) throw new Error('genesis')
      return {}
    },
    tipHeight: async () => tip,
    blockHeader: async (h: number) => header(h)
  }) as unknown as RtmElectrum

  const primary = fake(100, (h) => `good-${h}`)

  test('agrees when another server has the same header below the common tip', async () => {
    const asked: number[] = []
    const peerApi = fake(99, (h) => { asked.push(h); return `good-${h}` })
    expect(await crossCheck(primary, 100, ['p'], 2, () => peerApi)).toBe('agreed')
    expect(asked).toEqual([97])
  })

  test('reports a mismatch only when reachable servers disagree', async () => {
    const servers: Record<string, RtmElectrum> = {
      down: fake(0, () => '', { fail: true }),
      liar: fake(100, (h) => `fork-${h}`),
      honest: fake(100, (h) => `good-${h}`)
    }
    expect(await crossCheck(primary, 100, ['down', 'liar'], 2, (u) => servers[u])).toBe('mismatch')
    expect(await crossCheck(primary, 100, ['liar', 'honest'], 2, (u) => servers[u])).toBe('agreed')
    expect(await crossCheck(primary, 100, ['down'], 2, (u) => servers[u])).toBe('unverified')
  })
})
