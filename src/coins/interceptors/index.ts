import { BTCZ_API_INFO, btczApiInterceptor } from './btcz'
import { DASH_API_INFO, dashApiInterceptor } from './dash'
import { FIRO_API_INFO, firoApiInterceptor } from './firo'
import { RTM_API_INFO, rtmApiInterceptor } from './rtm'
import { createCoinApiInterceptor } from './factory'
import { getCoinPayloadCatalog } from '../payloads'
import { STANDARD_RUNTIME_META } from '../standardRuntimeMeta'
import {
  SERVER_SCAFFOLD_API_INFO_BY_NETWORK_ID,
  SERVER_SCAFFOLD_INTERCEPTOR_BY_NETWORK_ID
} from './serverScaffolds'
import type { CoinApiInfo, CoinApiInterceptor } from './types'

export const COIN_API_ORDER = ['rtm', 'dash', 'btcz', 'firo'] as const

const COIN_API_REGISTRY: ReadonlyArray<{
  networkId: (typeof COIN_API_ORDER)[number]
  interceptor: CoinApiInterceptor
  info: CoinApiInfo
}> = [
  { networkId: 'rtm', interceptor: rtmApiInterceptor, info: RTM_API_INFO },
  { networkId: 'dash', interceptor: dashApiInterceptor, info: DASH_API_INFO },
  { networkId: 'btcz', interceptor: btczApiInterceptor, info: BTCZ_API_INFO },
  { networkId: 'firo', interceptor: firoApiInterceptor, info: FIRO_API_INFO },
]

const INTERCEPTOR_BY_NETWORK_ID: Record<string, CoinApiInterceptor> = Object.fromEntries(
  COIN_API_REGISTRY.map((entry) => [entry.networkId, entry.interceptor])
)

const API_INFO_BY_NETWORK_ID: Record<string, CoinApiInfo> = Object.fromEntries(
  COIN_API_REGISTRY.map((entry) => [entry.networkId, entry.info])
)

const DYNAMIC_API_INFO_CACHE = new Map<string, CoinApiInfo>()
const DYNAMIC_INTERCEPTOR_CACHE = new Map<string, CoinApiInterceptor>()

function normalizeRegistryNetworkId(networkId?: string): string {
  const normalized = String(networkId || '').trim().toLowerCase()
  if (!normalized) return ''
  if (normalized === 'sdash' || normalized === 'srv--dash') return 'dash'
  if (normalized === 'btc' || normalized === 'bitcoin' || normalized === 'srv--btc') return 'srv--bitcoin'
  // Preserve scaffold IDs like "srv--bitcoin" and collapse only extra aliases
  // like "srv--bitcoin--alt" to their base scaffold key.
  if (normalized.startsWith('srv--')) {
    const parts = normalized.split('--')
    if (parts.length >= 2 && parts[1]) return `srv--${parts[1]}`
    return normalized
  }
  const aliasSep = normalized.indexOf('--')
  if (aliasSep > 0) return normalized.slice(0, aliasSep)
  return normalized
}

function resolveDefaultBridgePath(coinId: string): string {
  if (coinId === 'raptoreum' || coinId === 'xrp') return `/v1/bridge/${coinId}/main/wallet/mainwallet`
  return `/v1/bridge/${coinId}/main`
}

function resolveStandardProtocol(networkId: string, coinId: string): CoinApiInfo['protocol'] {
  if (
    networkId === 'cosmos'
    || networkId === 'cro'
    || coinId === 'cosmos'
    || coinId === 'cronos-pos'
  ) return 'cosmos-rest-bridge'
  if (
    networkId === 'eth'
    || networkId === 'base'
    || networkId === 'polygon'
    || networkId === 'cronos'
    || coinId === 'ethereum'
    || coinId === 'base'
    || coinId === 'polygon-bor'
    || coinId === 'cronos'
  ) return 'evm-jsonrpc'
  return 'utxo-jsonrpc'
}

function usesWalletScopedSendRoutes(coinId: string): boolean {
  return coinId === 'raptoreum' || coinId === 'xrp'
}

function createStandardApiInfo(networkId: string): CoinApiInfo | undefined {
  const meta = STANDARD_RUNTIME_META[networkId]
  if (!meta) return undefined
  const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || 'https://api.metayoshi.app').trim().replace(/\/+$/, '')
  const bridgePath = resolveDefaultBridgePath(meta.coinId)
  const walletScopedSend = usesWalletScopedSendRoutes(meta.coinId)
  return {
    networkId,
    symbol: meta.symbol,
    coinId: meta.coinId,
    chain: 'main',
    protocol: resolveStandardProtocol(networkId, meta.coinId),
    apiBaseUrl,
    defaultRpcUrl: apiBaseUrl,
    defaultBridgeUrl: `${apiBaseUrl}${bridgePath}`,
    defaultWallet: meta.coinId === 'raptoreum' || meta.coinId === 'xrp' ? 'mainwallet' : '',
    defaultExplorerUrl: '',
    healthUrl: `${apiBaseUrl}/health`,
    bridgeMethodsUrl: `${apiBaseUrl}/v1/bridge/methods/${meta.coinId}`,
    sendCoinPathTemplate: walletScopedSend
      ? `/v1/bridge/send/coin/${meta.coinId}/main/:wallet`
      : `/v1/bridge/send/coin/${meta.coinId}/main`,
    sendAssetPathTemplate: walletScopedSend
      ? `/v1/bridge/send/asset/${meta.coinId}/main/:wallet`
      : `/v1/bridge/send/asset/${meta.coinId}/main`,
    payloads: getCoinPayloadCatalog(networkId)
  }
}

export function getCoinApiInterceptor(networkId?: string): CoinApiInterceptor | undefined {
  const key = normalizeRegistryNetworkId(networkId)
  if (!key) return undefined
  const direct = INTERCEPTOR_BY_NETWORK_ID[key]
  if (direct) return direct
  const scaffolded = SERVER_SCAFFOLD_INTERCEPTOR_BY_NETWORK_ID[key]
  if (scaffolded) return scaffolded
  const cached = DYNAMIC_INTERCEPTOR_CACHE.get(key)
  if (cached) return cached
  const info = getCoinApiInfo(key)
  if (!info) return undefined
  const interceptor = createCoinApiInterceptor(info)
  DYNAMIC_INTERCEPTOR_CACHE.set(key, interceptor)
  return interceptor
}

export function getCoinApiInfo(networkId?: string): CoinApiInfo | undefined {
  const key = normalizeRegistryNetworkId(networkId)
  if (!key) return undefined
  const direct = API_INFO_BY_NETWORK_ID[key]
  if (direct) return direct
  const scaffolded = SERVER_SCAFFOLD_API_INFO_BY_NETWORK_ID[key]
  if (scaffolded) return scaffolded
  const cached = DYNAMIC_API_INFO_CACHE.get(key)
  if (cached) return cached
  const dynamic = createStandardApiInfo(key)
  if (dynamic) DYNAMIC_API_INFO_CACHE.set(key, dynamic)
  return dynamic
}

export {
  RTM_API_INFO,
  DASH_API_INFO,
  BTCZ_API_INFO,
  FIRO_API_INFO,
}

export type { CoinApiInfo, CoinApiInterceptor } from './types'
