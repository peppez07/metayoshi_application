import { getBuildFeatureFlag } from '../buildConfig'
import type { Network } from '../coins/types'
import { resolveSwapApiBaseUrl } from './apiBase'
import { buildDiscoveredUrl, discoverWalletBackend } from './backendHelp'
import { deriveServerApiBaseUrl } from './serverAddressApi'
import {
  createServerExecutionRpcConfig,
  fetchServerExecutionStatus,
  isTerminalServerExecutionStatus,
  requestServerSwapPrepare,
  requestServerSwapQuote,
  resolveServerSwapAssetDecimals,
  submitServerSwap,
  type ServerExecutionStatus,
  type ServerSponsorPreference,
  type ServerSwapAssetRef,
  type ServerSwapPrepareResponse,
  type ServerSwapQuote,
  type ServerSwapQuoteRequest,
  type ServerSwapSubmitRequest
} from './serverExecution'

export type WalletSwapApiVersion = 'legacy' | 'v1'
export type WalletSwapRoutePreference = 'best-value' | 'fastest' | 'lowest-gas' | 'safest'
export type WalletSwapReadinessState = 'active' | 'planned' | 'unsupported'
export type WalletSwapReadinessTone = 'emerald' | 'amber' | 'slate'
export type ServerSwapCatalogAssetKind = 'native' | 'fungible' | 'wrapped' | 'nft'

export type ServerSwapCatalogAsset = {
  networkId: string
  assetId: string
  symbol: string
  label: string
  kind: ServerSwapCatalogAssetKind
  contractAddress?: string
  logoUrl?: string
  decimals?: number
  aliases?: string[]
  isWrapped?: boolean
  wrapsAssetId?: string
  canonicalGroupId?: string
}

export type ServerSwapChainPair = {
  sourceNetworkId: string
  destinationNetworkId: string
  sourceChainId?: number
  destinationChainId?: number
}

export type ServerSwapMatrixMarket = {
  destinationNetworkId: string
  destinationNetworkName?: string
  routeCount: number
  providers: string[]
  routeKinds: string[]
  modes: string[]
  pathKinds: string[]
  destinationItems: ServerSwapCatalogAsset[]
}

export type WalletSwapReadiness = {
  state: WalletSwapReadinessState
  tone: WalletSwapReadinessTone
  engineLabel: string
  title: string
  detail: string
  canRequestQuotes: boolean
}

function readString(value: unknown): string {
  return String(value ?? '').trim()
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const parsed = Number(readString(value))
  return Number.isFinite(parsed) ? parsed : undefined
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => readString(item)).filter(Boolean)
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function buildSwapServiceFailure(endpointLabel: string, responseStatus: number, detail: string): Error {
  const compactDetail = readString(detail) || `HTTP ${responseStatus}`
  if (responseStatus === 401) {
    return new Error(`${endpointLabel} requires wallet auth on the MetaYoshi server`)
  }
  if (responseStatus === 502 || responseStatus === 503) {
    return new Error(`${endpointLabel} is temporarily unavailable on the MetaYoshi server`)
  }
  return new Error(`${endpointLabel} failed: ${compactDetail}`)
}

function getSwapApiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  const appApiKey = readString((import.meta as any)?.env?.VITE_APP_API_KEY)
  if (appApiKey) headers['X-API-Key'] = appApiKey
  return headers
}

async function resolveDiscoveredSwapEndpoint(
  kind: 'assetSearchUrl' | 'chainPairsUrl' | 'pairTokenRegistryUrl' | 'swapMatrixUrl' | 'tokenRegistryUrl',
  base?: unknown
): Promise<string | undefined> {
  const discovery = await discoverWalletBackend(base).catch(() => null)
  return String(discovery?.[kind] || '').trim() || undefined
}

function extractSwapCatalogRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  const record = asRecord(payload)
  const nestedItems = asRecord(record.items)
  const candidates = [
    record.assets,
    record.items,
    nestedItems.destinationItems,
    nestedItems.sourceItems,
    record.tokens,
    record.pairs,
    record.receive,
    record.receiveAssets,
    record.receiveTokens,
    record.destinationAssets,
    record.destinationTokens,
    record.destinationItems,
    record.sourceItems,
    record.results,
    record.data
  ]
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate
  }
  return []
}

export function resolveSwapServerNetworkId(network?: Pick<Network, 'id' | 'runtimeModelId'> | null): string {
  const normalized = readString(network?.runtimeModelId || network?.id).toLowerCase()
  if (normalized === 'sol') return 'solana'
  if (normalized === 'cosmos' || normalized === 'cosmoshub-4') return 'cosmoshub'
  return normalized
}

function normalizeSwapServerNetworkId(value: unknown): string {
  const raw = readString(value).toLowerCase().replace(/[_\s]+/g, '-')
  if (!raw) return ''
  switch (raw) {
    case 'sol':
    case 'solana-mainnet':
    case 'solana-mainnet-beta':
    case 'mainnet-beta':
      return 'solana'
    case 'ethereum':
    case '1':
      return 'eth'
    case 'arbitrum':
    case 'arbitrum-one':
    case '42161':
      return 'arb'
    case 'optimism':
    case '10':
      return 'op'
    case '8453':
      return 'base'
    case 'tron-mainnet':
      return 'tron'
    case 'cosmoshub-4':
      return 'cosmoshub'
    case 'osmosis-1':
      return 'osmosis'
    default:
      return raw
  }
}

function extractSwapAssetNetworkId(value: unknown): string {
  const raw = readString(value).toLowerCase()
  if (!raw.includes(':')) return ''
  const [, networkId = ''] = raw.split(':')
  return normalizeSwapServerNetworkId(networkId)
}

function matchesRequestedSwapNetwork(item: Record<string, unknown>, requestedNetworkId: string): boolean {
  const requested = normalizeSwapServerNetworkId(requestedNetworkId)
  if (!requested) return false

  const candidates = [
    normalizeSwapServerNetworkId(item.networkId),
    normalizeSwapServerNetworkId(item.chainKey),
    normalizeSwapServerNetworkId(item.chainId),
    extractSwapAssetNetworkId(item.assetId),
    extractSwapAssetNetworkId(item.wrapsAssetId)
  ].filter(Boolean)

  if (candidates.length === 0) return false
  return candidates.includes(requested)
}

function parseServerSwapCatalogAssetRows(
  rows: unknown[],
  requestedNetworkId: string,
  options: {
    allowNetworkFallback?: boolean
  } = {}
): ServerSwapCatalogAsset[] {
  const out: ServerSwapCatalogAsset[] = []
  const requested = normalizeSwapServerNetworkId(requestedNetworkId)

  for (const row of rows) {
    const item = asRecord(row)
    const hasScopedNetwork =
      Boolean(
        normalizeSwapServerNetworkId(item.networkId)
        || normalizeSwapServerNetworkId(item.chainKey)
        || normalizeSwapServerNetworkId(item.chainId)
        || extractSwapAssetNetworkId(item.assetId)
        || extractSwapAssetNetworkId(item.wrapsAssetId)
      )
    const matchesRequested = matchesRequestedSwapNetwork(item, requested)
    if (requested && !matchesRequested) {
      if (!(options.allowNetworkFallback && !hasScopedNetwork)) continue
    }

    const networkId = normalizeSwapServerNetworkId(item.networkId) || requested
    const contractAddress = readString(item.contractAddress || item.address || item.tokenAddress) || undefined
    const symbol = readString(item.symbol || item.ticker).toUpperCase()
    const label = readString(item.label || item.name) || symbol
    const kindRaw = readString(item.kind || item.type || item.tokenType).toLowerCase()
    const kind: ServerSwapCatalogAssetKind =
      kindRaw === 'native'
        ? 'native'
        : kindRaw === 'wrapped'
          ? 'wrapped'
          : kindRaw.includes('nft')
            ? 'nft'
            : kindRaw
              ? 'fungible'
              : (contractAddress ? 'fungible' : 'native')
    const assetId = readString(item.assetId)
      || (kind === 'native' ? `native:${networkId}` : (contractAddress || readString(item.id) || symbol))
    if (!assetId || !networkId || !symbol) continue

    out.push({
      networkId,
      assetId,
      symbol,
      label,
      kind,
      contractAddress,
      logoUrl: readString(item.logoUrl || item.logoURI || item.logoUri || item.iconUrl) || undefined,
      decimals: readNumber(item.decimals),
      aliases: readStringArray(item.aliases),
      isWrapped: Boolean(item.isWrapped),
      wrapsAssetId: readString(item.wrapsAssetId) || undefined,
      canonicalGroupId: readString(item.canonicalGroupId) || undefined
    })
  }

  return out
}

async function searchServerTokenRegistryAssets(
  apiBase: string,
  requestedNetworkId: string,
  input: {
    query?: string
    limit?: number
  } = {}
): Promise<ServerSwapCatalogAsset[]> {
  const query = readString(input.query)
  const limit = Math.max(1, Math.min(500, Math.trunc(Number(input.limit) || 100)))
  const discoveredEndpoint = await resolveDiscoveredSwapEndpoint('tokenRegistryUrl', apiBase)

  const requestUrl = (() => {
    const discoveredUrl = buildDiscoveredUrl(discoveredEndpoint, {
      chain: requestedNetworkId,
      swapEnabled: 'true',
      q: query || undefined,
      limit
    })
    if (discoveredUrl) return discoveredUrl

    const params = new URLSearchParams({
      swapEnabled: 'true',
      limit: String(limit)
    })
    if (query) params.set('q', query)

    return query
      ? `${apiBase}/v1/token-registry/${encodeURIComponent(requestedNetworkId)}?${params.toString()}`
      : `${apiBase}/v1/token-registry?${new URLSearchParams({
          chain: requestedNetworkId,
          swapEnabled: 'true',
          limit: String(limit)
        }).toString()}`
  })()

  const response = await fetch(requestUrl, {
    method: 'GET',
    headers: getSwapApiHeaders()
  })
  const text = await response.text().catch(() => '')
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }

  if (!response.ok) {
    const body = asRecord(json)
    const detail = readString(body.error || body.message || text || `HTTP ${response.status}`)
    if (response.status === 404 || response.status === 405 || response.status === 501) {
      throw new Error('Server swap token registry endpoint is unavailable')
    }
    throw new Error(`Server swap token registry request failed: ${detail || `HTTP ${response.status}`}`)
  }

  return parseServerSwapCatalogAssetRows(extractSwapCatalogRows(json), requestedNetworkId, {
    allowNetworkFallback: true
  })
}

function resolveSwapPairSide(
  item: Record<string, unknown>,
  side: 'source' | 'destination'
): { networkId: string; chainId?: number } {
  const prefix = side === 'source' ? 'source' : 'destination'
  const aliasPrefix = side === 'source' ? 'from' : 'to'
  const labelPrefix = side === 'source' ? 'sell' : 'buy'
  const direct = item[side] || item[aliasPrefix]
  const nested = asRecord(direct)
  const networkId = normalizeSwapServerNetworkId(
    direct
    || nested.networkId
    || nested.chainKey
    || nested.chain
    || nested.id
    || item[`${prefix}NetworkId`]
    || item[`${aliasPrefix}NetworkId`]
    || item[`${labelPrefix}NetworkId`]
    || item[`${prefix}Network`]
    || item[`${aliasPrefix}Network`]
    || item[`${prefix}ChainKey`]
    || item[`${aliasPrefix}ChainKey`]
  )
  const chainId = readNumber(
    nested.chainId
    || item[`${prefix}ChainId`]
    || item[`${aliasPrefix}ChainId`]
    || item[`${labelPrefix}ChainId`]
  )
  return { networkId, chainId }
}

function parseServerSwapMatrixMarkets(
  payload: unknown,
  sourceNetworkId: string
): ServerSwapMatrixMarket[] {
  const rows = extractSwapCatalogRows(payload)
  const out: ServerSwapMatrixMarket[] = []
  const seen = new Set<string>()

  for (const row of rows) {
    const item = asRecord(row)
    const destinationNetworkId = normalizeSwapServerNetworkId(
      item.destinationNetworkId
      || item.destinationChainKey
      || item.destinationChain
      || item.destination
    )
    if (!destinationNetworkId || seen.has(destinationNetworkId)) continue
    seen.add(destinationNetworkId)

    const destinationItems = parseServerSwapCatalogAssetRows(
      extractSwapCatalogRows(item.destinationItems),
      destinationNetworkId,
      { allowNetworkFallback: true }
    )

    out.push({
      destinationNetworkId,
      destinationNetworkName: readString(item.destinationChainName || item.destinationName) || undefined,
      routeCount: Math.max(0, Math.trunc(Number(item.routeCount) || 0)),
      providers: readStringArray(item.providers),
      routeKinds: readStringArray(item.routeKinds),
      modes: readStringArray(item.modes),
      pathKinds: readStringArray(item.pathKinds),
      destinationItems
    })
  }

  if (out.length > 0) return out

  const fallbackItems = parseServerSwapCatalogAssetRows(rows, sourceNetworkId, { allowNetworkFallback: true })
  return fallbackItems.length > 0
    ? [{
        destinationNetworkId: sourceNetworkId,
        routeCount: fallbackItems.length,
        providers: [],
        routeKinds: [],
        modes: [],
        pathKinds: [],
        destinationItems: fallbackItems
      }]
    : []
}

export function getWalletSwapApiVersion(): WalletSwapApiVersion {
  const raw = readString((import.meta as any)?.env?.VITE_SWAP_API_VERSION).toLowerCase()
  return raw === 'legacy' ? 'legacy' : 'v1'
}

export function isSolanaSwapPreviewEnabled(): boolean {
  return getBuildFeatureFlag('swapSolanaV1Enabled', 'VITE_SWAP_ENABLE_SOLANA_V1', false)
}

export function resolveWalletSwapReadiness(
  fromNetwork?: Pick<Network, 'coinType' | 'id' | 'name'> | null,
  toNetwork?: Pick<Network, 'coinType' | 'id' | 'name'> | null,
  fromAssetSymbol?: string | null,
  toAssetSymbol?: string | null
): WalletSwapReadiness {
  if (!fromNetwork || !toNetwork) {
    return {
      state: 'unsupported',
      tone: 'slate',
      engineLabel: 'Select networks',
      title: 'Choose networks to see swap readiness',
      detail: 'MetaYoshi enables swap routes per chain pair and execution model.',
      canRequestQuotes: false
    }
  }

  const sameChain = fromNetwork.id === toNetwork.id
  const version = getWalletSwapApiVersion()

  if (fromNetwork.coinType === 'SOL' && toNetwork.coinType === 'SOL' && sameChain) {
    return {
      state: 'active',
      tone: 'emerald',
      engineLabel: 'Jupiter Solana routing',
      title: 'Same-chain Solana swaps are available',
      detail: 'Quotes, signing payloads, and submit flow follow the live Jupiter-backed server contract.',
      canRequestQuotes: true
    }
  }

  if (fromNetwork.coinType === 'SUI' && toNetwork.coinType === 'SUI' && sameChain) {
    return {
      state: 'active',
      tone: 'emerald',
      engineLabel: 'Aftermath Sui routing',
      title: 'Same-chain Sui swaps are available',
      detail: 'Quotes use the MetaYoshi swap service, then the wallet signs the prepared Sui transaction and relays it through the bridge.',
      canRequestQuotes: true
    }
  }

  if (fromNetwork.coinType === 'EVM' && toNetwork.coinType === 'EVM' && sameChain) {
    return {
      state: 'active',
      tone: 'emerald',
      engineLabel: version === 'v1' ? 'V1 EVM routing' : 'Live EVM routing',
      title: 'Same-chain EVM swap search is available',
      detail: 'Quotes depend on what the MetaYoshi server currently exposes for the selected asset pair.',
      canRequestQuotes: true
    }
  }

  if (fromNetwork.coinType === 'EVM' && toNetwork.coinType === 'EVM' && !sameChain) {
    return {
      state: 'active',
      tone: 'emerald',
      engineLabel: 'Server-routed EVM bridge',
      title: 'Cross-chain EVM route search is available',
      detail: 'Cross-chain quotes depend on the current MetaYoshi server route inventory and provider health.',
      canRequestQuotes: true
    }
  }

  return {
    state: 'unsupported',
    tone: 'slate',
    engineLabel: 'Not supported',
    title: 'This pair is outside the current swap scope',
    detail: 'The current wallet build can only request quotes for compatible EVM, Solana, or same-chain Sui swap flows.',
    canRequestQuotes: false
  }
}

export async function searchServerSwapAssets(
  network: Pick<Network, 'id' | 'runtimeModelId' | 'bridgeUrl' | 'rpcUrl'>,
  input: {
    query?: string
    limit?: number
  } = {}
): Promise<ServerSwapCatalogAsset[]> {
  const apiBase = resolveSwapApiBaseUrl(deriveServerApiBaseUrl(network as Network))
  if (!apiBase) throw new Error('Server API base URL is not configured for swap asset search')
  const requestedNetworkId = resolveSwapServerNetworkId(network)

  if (getWalletSwapApiVersion() === 'v1') {
    try {
      return await searchServerTokenRegistryAssets(apiBase, requestedNetworkId, input)
    } catch (error) {
      const message = readString(error instanceof Error ? error.message : error)
      if (
        message
        && !message.includes('token registry endpoint is unavailable')
        && !message.includes('token registry request failed')
      ) {
        throw error
      }
    }
  }

  const params = new URLSearchParams()
  params.set('networkId', requestedNetworkId)
  if (readString(input.query)) params.set('q', readString(input.query))
  params.set('limit', String(Math.max(1, Math.min(500, Math.trunc(Number(input.limit) || 100)))))

  const discoveredEndpoint = await resolveDiscoveredSwapEndpoint('assetSearchUrl', apiBase)
  const requestUrl = buildDiscoveredUrl(discoveredEndpoint, {
    networkId: requestedNetworkId,
    q: readString(input.query) || undefined,
    limit: Math.max(1, Math.min(500, Math.trunc(Number(input.limit) || 100)))
  }) || `${apiBase}/v1/assets/search?${params.toString()}`

  const response = await fetch(requestUrl, {
    method: 'GET',
    headers: getSwapApiHeaders()
  })
  const text = await response.text().catch(() => '')
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }

  if (!response.ok) {
    const body = asRecord(json)
    const detail = readString(body.error || body.message || text || `HTTP ${response.status}`)
    if (response.status === 404) {
      throw new Error('Server swap asset search endpoint is unavailable')
    }
    throw buildSwapServiceFailure('Server swap asset search', response.status, detail)
  }

  const payload = asRecord(json)
  return parseServerSwapCatalogAssetRows(extractSwapCatalogRows(payload), requestedNetworkId)
}

export async function fetchServerSwapChainPairs(): Promise<ServerSwapChainPair[]> {
  if (getWalletSwapApiVersion() !== 'v1') return []
  const apiBase = resolveSwapApiBaseUrl()
  if (!apiBase) throw new Error('Server API base URL is not configured for swap chain pairs')

  const discoveredEndpoint = await resolveDiscoveredSwapEndpoint('chainPairsUrl', apiBase)
  const response = await fetch(discoveredEndpoint || `${apiBase}/v1/chains/swap/pairs`, {
    method: 'GET',
    headers: getSwapApiHeaders()
  })
  const text = await response.text().catch(() => '')
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }

  if (!response.ok) {
    const body = asRecord(json)
    const detail = readString(body.error || body.message || text || `HTTP ${response.status}`)
    if (response.status === 404) {
      throw new Error('Server swap chain pairs endpoint is unavailable')
    }
    throw buildSwapServiceFailure('Server swap chain pairs', response.status, detail)
  }

  const payload = asRecord(json)
  const rows = extractSwapCatalogRows(payload)
  const out: ServerSwapChainPair[] = []
  const seen = new Set<string>()

  for (const row of rows) {
    const item = asRecord(row)
    const source = resolveSwapPairSide(item, 'source')
    const destination = resolveSwapPairSide(item, 'destination')
    if (!source.networkId || !destination.networkId) continue
    const key = `${source.networkId}:${source.chainId ?? ''}->${destination.networkId}:${destination.chainId ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      sourceNetworkId: source.networkId,
      destinationNetworkId: destination.networkId,
      sourceChainId: source.chainId,
      destinationChainId: destination.chainId
    })
  }

  return out
}

export async function searchServerSwapPairAssets(
  input: {
    sourceNetwork: Pick<Network, 'id' | 'runtimeModelId' | 'chainId' | 'bridgeUrl' | 'rpcUrl'>
    destinationNetwork: Pick<Network, 'id' | 'runtimeModelId' | 'chainId' | 'bridgeUrl' | 'rpcUrl'>
    sourceAssetId?: string
    query?: string
    limit?: number
  }
): Promise<ServerSwapCatalogAsset[]> {
  const requestedSourceAssetId = readString(input.sourceAssetId)
  if (getWalletSwapApiVersion() !== 'v1') {
    if (requestedSourceAssetId) return []
    return await searchServerSwapAssets(input.destinationNetwork, {
      query: input.query,
      limit: input.limit
    })
  }

  const apiBase = resolveSwapApiBaseUrl(
    deriveServerApiBaseUrl(input.sourceNetwork as Network)
    || deriveServerApiBaseUrl(input.destinationNetwork as Network)
  )
  if (!apiBase) {
    if (requestedSourceAssetId) return []
    return await searchServerSwapAssets(input.destinationNetwork, {
      query: input.query,
      limit: input.limit
    })
  }

  const sourceNetworkId = resolveSwapServerNetworkId(input.sourceNetwork)
  const destinationNetworkId = resolveSwapServerNetworkId(input.destinationNetwork)
  const params = new URLSearchParams()
  params.set('sourceNetworkId', sourceNetworkId)
  params.set('destinationNetworkId', destinationNetworkId)
  params.set('networkId', destinationNetworkId)
  if (requestedSourceAssetId) params.set('sourceAssetId', requestedSourceAssetId)
  if (Number.isFinite(Number(input.sourceNetwork.chainId))) {
    params.set('sourceChainId', String(input.sourceNetwork.chainId))
  }
  if (Number.isFinite(Number(input.destinationNetwork.chainId))) {
    params.set('destinationChainId', String(input.destinationNetwork.chainId))
  }
  if (readString(input.query)) params.set('q', readString(input.query))
  params.set('limit', String(Math.max(1, Math.min(500, Math.trunc(Number(input.limit) || 100)))))
  params.set('sourceChain', sourceNetworkId)
  params.set('destinationChain', destinationNetworkId)
  if (readString(input.query)) params.set('destinationQ', readString(input.query))

  const discoveredEndpoint = await resolveDiscoveredSwapEndpoint('pairTokenRegistryUrl', apiBase)
  const requestUrl = buildDiscoveredUrl(discoveredEndpoint, {
    sourceNetworkId,
    destinationNetworkId,
    networkId: destinationNetworkId,
    sourceAssetId: requestedSourceAssetId || undefined,
    sourceChain: sourceNetworkId,
    destinationChain: destinationNetworkId,
    sourceChainId: Number.isFinite(Number(input.sourceNetwork.chainId)) ? String(input.sourceNetwork.chainId) : undefined,
    destinationChainId: Number.isFinite(Number(input.destinationNetwork.chainId)) ? String(input.destinationNetwork.chainId) : undefined,
    q: readString(input.query) || undefined,
    destinationQ: readString(input.query) || undefined,
    limit: Math.max(1, Math.min(500, Math.trunc(Number(input.limit) || 100)))
  }) || `${apiBase}/v1/token-registry/swap/pair?${params.toString()}`

  const response = await fetch(requestUrl, {
    method: 'GET',
    headers: getSwapApiHeaders()
  })
  const text = await response.text().catch(() => '')
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }

  if (!response.ok) {
    if (response.status === 404 || response.status === 405 || response.status === 501) {
      if (requestedSourceAssetId) return []
      return await searchServerSwapAssets(input.destinationNetwork, {
        query: input.query,
        limit: input.limit
      })
    }
    const body = asRecord(json)
    const detail = readString(body.error || body.message || text || `HTTP ${response.status}`)
    throw buildSwapServiceFailure('Server swap pair token registry', response.status, detail)
  }

  const payload = asRecord(json)
  const parsed = parseServerSwapCatalogAssetRows(
    extractSwapCatalogRows(payload),
    destinationNetworkId,
    { allowNetworkFallback: true }
  )
  if (parsed.length > 0) return parsed

  if (requestedSourceAssetId) return []
  return await searchServerSwapAssets(input.destinationNetwork, {
    query: input.query,
    limit: input.limit
  })
}

export async function fetchServerSwapMatrix(input: {
  sourceNetwork: Pick<Network, 'id' | 'runtimeModelId' | 'bridgeUrl' | 'rpcUrl'>
  sourceAssetId: string
}): Promise<ServerSwapMatrixMarket[]> {
  if (getWalletSwapApiVersion() !== 'v1') return []

  const apiBase = resolveSwapApiBaseUrl(deriveServerApiBaseUrl(input.sourceNetwork as Network))
  if (!apiBase) throw new Error('Server API base URL is not configured for swap matrix')

  const sourceNetworkId = resolveSwapServerNetworkId(input.sourceNetwork)
  const sourceAssetId = readString(input.sourceAssetId)
  if (!sourceNetworkId || !sourceAssetId) return []

  const discoveredEndpoint = await resolveDiscoveredSwapEndpoint('swapMatrixUrl', apiBase)
  const requestUrl = buildDiscoveredUrl(discoveredEndpoint, {
    sourceChain: sourceNetworkId,
    sourceAssetId
  }) || `${apiBase}/v1/token-registry/swap/matrix?${new URLSearchParams({
    sourceChain: sourceNetworkId,
    sourceAssetId
  }).toString()}`

  const response = await fetch(requestUrl, {
    method: 'GET',
    headers: getSwapApiHeaders()
  })
  const text = await response.text().catch(() => '')
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }

  if (!response.ok) {
    if (response.status === 404 || response.status === 405 || response.status === 501) {
      return []
    }
    const body = asRecord(json)
    const detail = readString(body.error || body.message || text || `HTTP ${response.status}`)
    throw buildSwapServiceFailure('Server swap matrix', response.status, detail)
  }

  return parseServerSwapMatrixMarkets(json, sourceNetworkId)
}

export {
  createServerExecutionRpcConfig,
  fetchServerExecutionStatus,
  isTerminalServerExecutionStatus,
  requestServerSwapPrepare,
  requestServerSwapQuote,
  resolveServerSwapAssetDecimals,
  submitServerSwap
}

export type {
  ServerExecutionStatus,
  ServerSponsorPreference,
  ServerSwapAssetRef,
  ServerSwapPrepareResponse,
  ServerSwapQuote,
  ServerSwapQuoteRequest,
  ServerSwapSubmitRequest
}
