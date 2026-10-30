/**
 * Server discovery and cross-checking.
 *
 * Every HTTPS gateway publishes `/api/v1/servers`: other gateways it has
 * verified among Raptoreum smartnodes (found through its own Core node).
 * The wallet treats that list only as candidates: each server must still pass
 * the genesis check before use, and block headers are compared across servers
 * so one dishonest server cannot silently show a different chain.
 */
import { ElectrumClient, isValidServerUrl } from './client'
import { RtmElectrum } from './rtmElectrum'

export interface DiscoveredServer {
  url: string
  height: number
  assetsReady: boolean
  smartnode: boolean
  /** Local time this wallet last saw the server listed or used it. */
  seenAt: number
}

export type ChainCheck = 'idle' | 'checking' | 'agreed' | 'mismatch' | 'unverified'

const GATEWAY_PATH = '/api/v1/electrum'
const MAX_LIST_BYTES = 256 * 1024
const MAX_KNOWN = 64
export const PEER_MAX_AGE_MS = 7 * 24 * 3600_000
const FETCH_TIMEOUT_MS = 8000

/** `https://host/api/v1/servers` for an HTTPS gateway URL; null for other transports. */
export function serversEndpoint(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.pathname !== GATEWAY_PATH) return null
    return `${parsed.origin}/api/v1/servers`
  } catch {
    return null
  }
}

/** Only plain `https://host/api/v1/electrum` URLs are accepted from other servers. */
export function isDiscoverableUrl(url: string): boolean {
  if (!isValidServerUrl(url)) return false
  const parsed = new URL(url)
  return parsed.protocol === 'https:' && parsed.pathname === GATEWAY_PATH && !parsed.search &&
    !parsed.port && `https://${parsed.hostname}${GATEWAY_PATH}` === url
}

export function parsePeerList(body: unknown, now: number): DiscoveredServer[] {
  const list = (body as any)?.servers
  if (!Array.isArray(list)) return []
  const out: DiscoveredServer[] = []
  for (const item of list.slice(0, 256)) {
    const url = typeof item?.url === 'string' ? item.url : ''
    const height = item?.height
    if (!isDiscoverableUrl(url) || !Number.isSafeInteger(height) || height <= 0) continue
    out.push({ url, height, assetsReady: item.assetsReady === true || item.assets_ready === true, smartnode: item.smartnode === true, seenAt: now })
  }
  return out
}

export async function fetchPeers(serverUrl: string, fetchImpl: typeof fetch = fetch): Promise<DiscoveredServer[]> {
  const endpoint = serversEndpoint(serverUrl)
  if (!endpoint) return []
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetchImpl(endpoint, { credentials: 'omit', redirect: 'error', cache: 'no-store', signal: controller.signal })
    if (!response.ok) return []
    const text = await response.text()
    if (text.length > MAX_LIST_BYTES) return []
    return parsePeerList(JSON.parse(text), Date.now())
  } catch {
    return []
  } finally {
    clearTimeout(timer)
  }
}

/** Merges by URL, keeps the newest sighting, drops stale entries and caps the list. */
export function mergePeers(known: DiscoveredServer[], incoming: DiscoveredServer[], now: number): DiscoveredServer[] {
  const byUrl = new Map<string, DiscoveredServer>()
  for (const peer of [...known, ...incoming]) {
    if (now - peer.seenAt > PEER_MAX_AGE_MS || !isDiscoverableUrl(peer.url)) continue
    const previous = byUrl.get(peer.url)
    if (!previous || peer.seenAt >= previous.seenAt) byUrl.set(peer.url, peer)
  }
  return [...byUrl.values()]
    .sort((a, b) => b.seenAt - a.seenAt || b.height - a.height)
    .slice(0, MAX_KNOWN)
}

/** Connection order: chosen server, user servers, then discovered servers (most recently seen first). */
export function connectionCandidates(active: string, configured: string[], discovered: DiscoveredServer[], maxDiscovered = 6): string[] {
  const extra = discovered
    .filter((p) => p.assetsReady)
    .sort((a, b) => b.seenAt - a.seenAt || b.height - a.height)
    .slice(0, maxDiscovered)
    .map((p) => p.url)
  return Array.from(new Set([active, ...configured, ...extra].filter(Boolean)))
}

/**
 * Compares the header two blocks below the common tip with up to `limit` other
 * servers. A single agreeing server is enough; a mismatch is only reported when
 * every reachable server disagrees.
 */
export async function crossCheck(
  primary: RtmElectrum,
  primaryTip: number,
  others: string[],
  limit = 2,
  open: (url: string) => RtmElectrum = (url) => new RtmElectrum(new ElectrumClient(url))
): Promise<'agreed' | 'mismatch' | 'unverified'> {
  let disagreements = 0
  let compared = 0
  for (const url of others) {
    if (compared >= limit) break
    const peer = open(url)
    try {
      await peer.verifyNetwork()
      const height = Math.min(primaryTip, await peer.tipHeight()) - 2
      if (height <= 0) continue
      const [mine, theirs] = await Promise.all([primary.blockHeader(height), peer.blockHeader(height)])
      compared += 1
      if (mine === theirs) return 'agreed'
      disagreements += 1
    } catch {
      // Unreachable or synchronizing peers neither confirm nor refute.
    } finally {
      peer.client.close()
    }
  }
  return disagreements > 0 ? 'mismatch' : 'unverified'
}
