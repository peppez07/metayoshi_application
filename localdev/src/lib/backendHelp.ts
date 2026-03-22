import { normalizeConfiguredApiBaseUrl } from './apiBase'

const HELP_TIMEOUT_MS = 6000
const DEFAULT_PUBLIC_HELP_ORIGIN = 'https://api.metayoshi.app'

type HelpCommands = Record<string, string[]>

export type WalletHelpIndex = {
  startHere?: string[]
  helpTopics?: string[]
  commands?: HelpCommands
}

export type WalletHelpBootstrap = {
  startup?: {
    preferredAuthConfigUrl?: string
    primaryHelpUrl?: string
    nextCommands?: string[]
  }
  runtime?: {
    ok?: boolean
    services?: Record<string, {
      ok?: boolean
      status?: string
      url?: string
      error?: string | null
      payload?: unknown
    }>
  }
}

export type WalletBackendDiscovery = {
  helpOrigin: string
  helpIndex: WalletHelpIndex | null
  bootstrap: WalletHelpBootstrap | null
  authConfigUrl?: string
  runtimeHealthUrl?: string
  coinsUrl?: string
  chainsUrl?: string
  providersCapabilitiesUrl?: string
  tokenRegistryUrl?: string
  assetSearchUrl?: string
  chainPairsUrl?: string
  pairTokenRegistryUrl?: string
  swapMatrixUrl?: string
  swapHelpUrl?: string
  providersHelpUrl?: string
}

export type WalletAuthConfig = {
  ok?: boolean
  preferredMode?: string
  walletPasswordRequired?: boolean
  session?: {
    enabled?: boolean
    challengePath?: string
    verifyPath?: string
    signatureVerifier?: {
      configured?: boolean
      url?: string
    }
  }
  secureBridge?: {
    preferredWritePath?: string
    opTokenPath?: string
    walletRecommended?: boolean
    secureBridgeWritesReady?: boolean
  }
  legacyBasic?: {
    enabled?: boolean
    walletRecommended?: boolean
  }
}

const discoveryCache = new Map<string, Promise<WalletBackendDiscovery | null>>()

function isLocalHostname(hostname: string): boolean {
  const host = String(hostname || '').trim().toLowerCase()
  if (!host) return true
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return true
  return false
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)]
}

function toOrigin(value: string): string {
  try {
    return new URL(value).origin
  } catch {
    return ''
  }
}

function toApiHelpOrigin(origin: string): string {
  if (!origin) return ''
  try {
    const parsed = new URL(origin)
    if (isLocalHostname(parsed.hostname)) return parsed.origin
    const parts = parsed.hostname.split('.').filter(Boolean)
    if (parts.length < 2) return parsed.origin
    if (parts[0] === 'api') return parsed.origin
    if (['balance', 'send', 'swap', 'tokens', 'www'].includes(parts[0])) {
      parts[0] = 'api'
    } else {
      parts.unshift('api')
    }
    parsed.hostname = parts.join('.')
    return parsed.origin
  } catch {
    return origin
  }
}

function resolveConfiguredBase(base?: unknown): string {
  return normalizeConfiguredApiBaseUrl(base)
    || normalizeConfiguredApiBaseUrl((import.meta as any)?.env?.VITE_API_BASE_URL)
    || ''
}

function isLocalBackendHelpEnabled(): boolean {
  return String((import.meta as any)?.env?.VITE_ENABLE_LOCAL_BACKEND_HELP || '').trim().toLowerCase() === 'true'
}

function resolveHelpOriginCandidates(base?: unknown): string[] {
  const configuredBase = resolveConfiguredBase(base)
  const configuredOrigin = toOrigin(configuredBase)
  const candidates: string[] = []
  const allowLocalHelp = isLocalBackendHelpEnabled()

  if (configuredOrigin) {
    const configuredIsLocal = (() => {
      try {
        return isLocalHostname(new URL(configuredOrigin).hostname)
      } catch {
        return false
      }
    })()
    if (!configuredIsLocal || allowLocalHelp) {
      candidates.push(configuredOrigin)
    }
    try {
      const parsed = new URL(configuredOrigin)
      if (!isLocalHostname(parsed.hostname)) {
        candidates.push(toApiHelpOrigin(configuredOrigin))
      }
    } catch {
      // ignore invalid configured origin
    }
  } else {
    candidates.push(DEFAULT_PUBLIC_HELP_ORIGIN)
  }

  candidates.push(DEFAULT_PUBLIC_HELP_ORIGIN)
  return unique(candidates.filter(Boolean))
}

async function fetchJsonWithTimeout(url: string, timeoutMs = HELP_TIMEOUT_MS): Promise<Record<string, unknown> | null> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { method: 'GET', signal: controller.signal })
    if (!response.ok) return null
    const json = await response.json().catch(() => null)
    return json && typeof json === 'object' ? (json as Record<string, unknown>) : null
  } catch {
    return null
  } finally {
    window.clearTimeout(timer)
  }
}

function flattenCommandGroups(index: WalletHelpIndex | null): string[] {
  if (!index) return []
  const out: string[] = []
  if (Array.isArray(index.startHere)) out.push(...index.startHere)
  const commands = index.commands
  if (commands && typeof commands === 'object') {
    for (const values of Object.values(commands)) {
      if (Array.isArray(values)) out.push(...values)
    }
  }
  return out.filter((value) => typeof value === 'string' && value.trim().length > 0)
}

function scoreCommandPath(candidatePath: string, wantedPath: string): number {
  const candidate = String(candidatePath || '').trim()
  const wanted = String(wantedPath || '').trim()
  if (!candidate || !wanted) return 0
  if (candidate === wanted) return 3
  if (candidate.startsWith(`${wanted}/`)) return 2
  if (candidate.includes(wanted)) return 1
  return 0
}

function extractCommandUrl(commands: string[], method: string, pathFragment: string, baseOrigin: string): string | undefined {
  const wantedMethod = String(method || '').trim().toUpperCase()
  const wantedPath = String(pathFragment || '').trim()
  let bestUrl: string | undefined
  let bestScore = 0
  for (const command of commands) {
    const match = String(command || '').trim().match(/^([A-Z]+)\s+(.+)$/)
    if (!match) continue
    const [, candidateMethod, candidateUrlRaw] = match
    if (candidateMethod.toUpperCase() !== wantedMethod) continue
    try {
      const candidateUrl = new URL(candidateUrlRaw, baseOrigin)
      const score = scoreCommandPath(candidateUrl.pathname, wantedPath)
      if (score > bestScore) {
        bestScore = score
        bestUrl = candidateUrl.toString()
      }
    } catch {
      continue
    }
  }
  return bestUrl
}

async function probeWalletHelp(origin: string): Promise<WalletBackendDiscovery | null> {
  const helpIndexRaw = await fetchJsonWithTimeout(`${origin}/v1/help/wallet`)
  if (!helpIndexRaw) return null

  const helpIndex = helpIndexRaw as WalletHelpIndex
  const bootstrapRaw = await fetchJsonWithTimeout(`${origin}/v1/help/wallet/bootstrap`)
  const bootstrap = bootstrapRaw as WalletHelpBootstrap | null
  const commands = flattenCommandGroups(helpIndex)

  return {
    helpOrigin: origin,
    helpIndex,
    bootstrap,
    authConfigUrl:
      extractCommandUrl(commands, 'GET', '/v1/auth/config', origin)
      || String(bootstrap?.startup?.preferredAuthConfigUrl || '').trim()
      || undefined,
    runtimeHealthUrl: extractCommandUrl(commands, 'GET', '/v1/runtime/health', origin) || undefined,
    coinsUrl: extractCommandUrl(commands, 'GET', '/v1/coins', origin) || undefined,
    chainsUrl: extractCommandUrl(commands, 'GET', '/v1/chains', origin) || undefined,
    providersCapabilitiesUrl: extractCommandUrl(commands, 'GET', '/v1/providers/capabilities', origin) || undefined,
    tokenRegistryUrl: extractCommandUrl(commands, 'GET', '/v1/token-registry', origin) || undefined,
    assetSearchUrl: extractCommandUrl(commands, 'GET', '/v1/assets/search', origin) || undefined,
    chainPairsUrl: extractCommandUrl(commands, 'GET', '/v1/chains/swap/pairs', origin) || undefined,
    pairTokenRegistryUrl: extractCommandUrl(commands, 'GET', '/v1/token-registry/swap/pair', origin) || undefined,
    swapMatrixUrl: extractCommandUrl(commands, 'GET', '/v1/token-registry/swap/matrix', origin) || undefined,
    swapHelpUrl: extractCommandUrl(commands, 'GET', '/help', origin) || undefined,
    providersHelpUrl: extractCommandUrl(commands, 'GET', '/help/providers', origin) || undefined
  }
}

export async function discoverWalletBackend(base?: unknown): Promise<WalletBackendDiscovery | null> {
  const cacheKey = resolveConfiguredBase(base) || '__default__'
  const cached = discoveryCache.get(cacheKey)
  if (cached) return await cached

  const pending = (async () => {
    const candidates = resolveHelpOriginCandidates(base)
    for (const origin of candidates) {
      const discovered = await probeWalletHelp(origin)
      if (discovered) return discovered
    }
    return null
  })()

  discoveryCache.set(cacheKey, pending)
  return await pending
}

export function buildDiscoveredUrl(
  value: string | undefined,
  params?: Record<string, string | number | undefined>
): string | null {
  let raw = String(value || '').trim()
  if (!raw) return null
  if (params) {
    for (const [key, entry] of Object.entries(params)) {
      if (entry === undefined || entry === null) continue
      raw = raw.replace(
        new RegExp(`\\{${String(key).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}`, 'g'),
        encodeURIComponent(String(entry))
      )
    }
  }
  try {
    const url = new URL(raw)
    if (params) {
      for (const [key, entry] of Object.entries(params)) {
        if (entry === undefined || entry === null || String(entry).trim() === '') continue
        url.searchParams.set(key, String(entry))
      }
    }
    const unresolvedKeys = [...url.searchParams.keys()]
    for (const key of unresolvedKeys) {
      const value = url.searchParams.get(key)
      if (/^\{[^{}]+\}$/.test(String(value || '').trim())) {
        url.searchParams.delete(key)
      }
    }
    return url.toString()
  } catch {
    return null
  }
}

export function getDiscoveredGatewayBase(discovery: WalletBackendDiscovery | null, fallbackBase: string): string {
  const discoveredOrigin = toOrigin(String(discovery?.authConfigUrl || '').trim())
  return discoveredOrigin || toOrigin(fallbackBase) || fallbackBase
}

export function getDiscoveredRuntimeService(
  discovery: WalletBackendDiscovery | null,
  serviceKey: string
): {
  ok?: boolean
  status?: string
  url?: string
  error?: string | null
  payload?: unknown
} | null {
  const services = discovery?.bootstrap?.runtime?.services
  if (!services || typeof services !== 'object') return null
  const service = services[serviceKey]
  return service && typeof service === 'object' ? service : null
}

export async function fetchBackendJson(
  url: string | undefined,
  params?: Record<string, string | number | boolean | undefined>,
  timeoutMs = HELP_TIMEOUT_MS
): Promise<Record<string, unknown> | null> {
  const finalUrl = buildDiscoveredUrl(url, params as Record<string, string | number | undefined> | undefined)
  if (!finalUrl) return null
  return await fetchJsonWithTimeout(finalUrl, timeoutMs)
}

export async function fetchDiscoveredRuntimeHealth(base?: unknown): Promise<Record<string, unknown> | null> {
  const discovery = await discoverWalletBackend(base)
  return await fetchBackendJson(discovery?.runtimeHealthUrl)
}

export async function fetchDiscoveredAuthConfig(base?: unknown): Promise<WalletAuthConfig | null> {
  const discovery = await discoverWalletBackend(base)
  const configuredBase = resolveConfiguredBase(base)
  const gatewayBase = getDiscoveredGatewayBase(discovery, configuredBase || DEFAULT_PUBLIC_HELP_ORIGIN)
  const authConfigUrl = String(discovery?.authConfigUrl || `${gatewayBase}/v1/auth/config`).trim()
  if (!authConfigUrl) return null
  const payload = await fetchBackendJson(authConfigUrl)
  return payload as WalletAuthConfig | null
}

export async function fetchDiscoveredCoins(base?: unknown): Promise<Record<string, unknown> | null> {
  const discovery = await discoverWalletBackend(base)
  return await fetchBackendJson(discovery?.coinsUrl)
}

export async function fetchDiscoveredChains(
  base?: unknown,
  params?: Record<string, string | number | boolean | undefined>
): Promise<Record<string, unknown> | null> {
  const discovery = await discoverWalletBackend(base)
  return await fetchBackendJson(discovery?.chainsUrl, params)
}

export async function fetchDiscoveredProviderCapabilities(base?: unknown): Promise<Record<string, unknown> | null> {
  const discovery = await discoverWalletBackend(base)
  return await fetchBackendJson(discovery?.providersCapabilitiesUrl)
}

export async function fetchDiscoveredTokenRegistry(
  base: unknown,
  params?: Record<string, string | number | boolean | undefined>
): Promise<Record<string, unknown> | null> {
  const discovery = await discoverWalletBackend(base)
  return await fetchBackendJson(discovery?.tokenRegistryUrl, params)
}
