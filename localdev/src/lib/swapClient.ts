import { getBuildFeatureFlag } from '../buildConfig'
import type { Network } from '../coins/types'
import { resolveSwapApiBaseUrl } from './apiBase'
import { deriveServerApiBaseUrl } from './serverAddressApi'
import {
  createServerExecutionRpcConfig,
  fetchServerExecutionStatus,
  isTerminalServerExecutionStatus,
  requestServerSwapQuote,
  resolveServerSwapAssetDecimals,
  submitServerSwap,
  type ServerExecutionStatus,
  type ServerSponsorPreference,
  type ServerSwapAssetRef,
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

export function resolveSwapServerNetworkId(network?: Pick<Network, 'id' | 'runtimeModelId'> | null): string {
  const normalized = readString(network?.runtimeModelId || network?.id).toLowerCase()
  if (normalized === 'sol') return 'solana'
  return normalized
}

export function getWalletSwapApiVersion(): WalletSwapApiVersion {
  const raw = readString((import.meta as any)?.env?.VITE_SWAP_API_VERSION).toLowerCase()
  return raw === 'v1' ? 'v1' : 'legacy'
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
    detail: 'The current wallet build can only request quotes for compatible EVM or Solana swap flows.',
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

  const params = new URLSearchParams()
  params.set('networkId', resolveSwapServerNetworkId(network))
  if (readString(input.query)) params.set('q', readString(input.query))
  params.set('limit', String(Math.max(1, Math.min(500, Math.trunc(Number(input.limit) || 100)))))

  const headers: Record<string, string> = {}
  const appApiKey = readString((import.meta as any)?.env?.VITE_APP_API_KEY)
  if (appApiKey) headers['X-API-Key'] = appApiKey

  const response = await fetch(`${apiBase}/v1/assets/search?${params.toString()}`, {
    method: 'GET',
    headers
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
    throw new Error(`Server swap asset search failed: ${detail || `HTTP ${response.status}`}`)
  }

  const payload = asRecord(json)
  const rows = Array.isArray(payload.assets)
    ? payload.assets
    : (Array.isArray(payload.items) ? payload.items : [])

  const out: ServerSwapCatalogAsset[] = []
  for (const row of rows) {
    const item = asRecord(row)
    const assetId = readString(item.assetId)
    const networkId = readString(item.networkId) || readString(network.id)
    const symbol = readString(item.symbol)
    const label = readString(item.label) || symbol
    const kindRaw = readString(item.kind).toLowerCase()
    const kind: ServerSwapCatalogAssetKind =
      kindRaw === 'native' || kindRaw === 'wrapped' || kindRaw === 'nft' ? kindRaw : 'fungible'
    if (!assetId || !networkId || !symbol) continue
    out.push({
      networkId,
      assetId,
      symbol,
      label,
      kind,
      contractAddress: readString(item.contractAddress) || undefined,
      logoUrl: readString(item.logoUrl || item.logoURI || item.logoUri) || undefined,
      decimals: readNumber(item.decimals),
      aliases: readStringArray(item.aliases),
      isWrapped: Boolean(item.isWrapped),
      wrapsAssetId: readString(item.wrapsAssetId) || undefined,
      canonicalGroupId: readString(item.canonicalGroupId) || undefined
    })
  }
  return out
}

export {
  createServerExecutionRpcConfig,
  fetchServerExecutionStatus,
  isTerminalServerExecutionStatus,
  requestServerSwapQuote,
  resolveServerSwapAssetDecimals,
  submitServerSwap
}

export type {
  ServerExecutionStatus,
  ServerSponsorPreference,
  ServerSwapAssetRef,
  ServerSwapQuote,
  ServerSwapQuoteRequest,
  ServerSwapSubmitRequest
}
