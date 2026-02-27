import { ARR_API_INFO, arrApiInterceptor } from './arr'
import { ADA_API_INFO, adaApiInterceptor } from './cardano'
import { BTCZ_API_INFO, btczApiInterceptor } from './btcz'
import { DOGE_API_INFO, dogeApiInterceptor } from './doge'
import { FIRO_API_INFO, firoApiInterceptor } from './firo'
import { XMR_API_INFO, xmrApiInterceptor } from './monero'
import { RTM_API_INFO, rtmApiInterceptor } from './rtm'
import { TIDE_API_INFO, tideApiInterceptor } from './tide'
import { XRP_API_INFO, xrpApiInterceptor } from './xrp'
import { createCoinApiInterceptor } from './factory'
import { getCoinPayloadCatalog } from '../payloads'
import {
  SERVER_SCAFFOLD_API_INFO_BY_NETWORK_ID,
  SERVER_SCAFFOLD_INTERCEPTOR_BY_NETWORK_ID
} from './serverScaffolds'
import type { CoinApiInfo, CoinApiInterceptor } from './types'

export const COIN_API_ORDER = ['rtm', 'doge', 'btcz', 'tide', 'firo', 'xrp', 'arr', 'xmr', 'ada'] as const

const COIN_API_REGISTRY: ReadonlyArray<{
  networkId: (typeof COIN_API_ORDER)[number]
  interceptor: CoinApiInterceptor
  info: CoinApiInfo
}> = [
  { networkId: 'rtm', interceptor: rtmApiInterceptor, info: RTM_API_INFO },
  { networkId: 'doge', interceptor: dogeApiInterceptor, info: DOGE_API_INFO },
  { networkId: 'btcz', interceptor: btczApiInterceptor, info: BTCZ_API_INFO },
  { networkId: 'tide', interceptor: tideApiInterceptor, info: TIDE_API_INFO },
  { networkId: 'firo', interceptor: firoApiInterceptor, info: FIRO_API_INFO },
  { networkId: 'xrp', interceptor: xrpApiInterceptor, info: XRP_API_INFO },
  { networkId: 'arr', interceptor: arrApiInterceptor, info: ARR_API_INFO },
  { networkId: 'xmr', interceptor: xmrApiInterceptor, info: XMR_API_INFO },
  { networkId: 'ada', interceptor: adaApiInterceptor, info: ADA_API_INFO }
]

const INTERCEPTOR_BY_NETWORK_ID: Record<string, CoinApiInterceptor> = Object.fromEntries(
  COIN_API_REGISTRY.map((entry) => [entry.networkId, entry.interceptor])
)

const API_INFO_BY_NETWORK_ID: Record<string, CoinApiInfo> = Object.fromEntries(
  COIN_API_REGISTRY.map((entry) => [entry.networkId, entry.info])
)

type StandardApiMeta = {
  symbol: string
  coinId: string
}

const STANDARD_API_META: Record<string, StandardApiMeta> = {
  rtm: { symbol: 'RTM', coinId: 'raptoreum' },
  doge: { symbol: 'DOGE', coinId: 'dogecoin' },
  btcz: { symbol: 'BTCZ', coinId: 'bitcoinz' },
  tide: { symbol: 'TIDE', coinId: 'tidecoin' },
  firo: { symbol: 'FIRO', coinId: 'firo' },
  xrp: { symbol: 'XRP', coinId: 'xrp' },
  arr: { symbol: 'ARRR', coinId: 'arr' },
  xmr: { symbol: 'XMR', coinId: 'monero' },
  ada: { symbol: 'ADA', coinId: 'cardano' },
  eth: { symbol: 'ETH', coinId: 'ethereum' },
  arb: { symbol: 'ETH', coinId: 'arbitrum-one' },
  base: { symbol: 'ETH', coinId: 'base' },
  bnb: { symbol: 'BNB', coinId: 'bsc' },
  cro: { symbol: 'CRO', coinId: 'cronos' },
  polygon: { symbol: 'MATIC', coinId: 'polygon-bor' },
  avaxc: { symbol: 'AVAX', coinId: 'avalanche-c-chain' },
  sol: { symbol: 'SOL', coinId: 'solana' },
  xlm: { symbol: 'XLM', coinId: 'stellar' },
  tron: { symbol: 'TRX', coinId: 'tron' }
}

const DYNAMIC_API_INFO_CACHE = new Map<string, CoinApiInfo>()
const DYNAMIC_INTERCEPTOR_CACHE = new Map<string, CoinApiInterceptor>()

function normalizeRegistryNetworkId(networkId?: string): string {
  const normalized = String(networkId || '').trim().toLowerCase()
  if (!normalized) return ''
  const aliasSep = normalized.indexOf('--')
  if (aliasSep > 0) return normalized.slice(0, aliasSep)
  return normalized
}

function resolveDefaultBridgePath(coinId: string): string {
  if (coinId === 'raptoreum' || coinId === 'xrp') return `/v1/bridge/${coinId}/main/wallet/mainwallet`
  return `/v1/bridge/${coinId}/main`
}

function createStandardApiInfo(networkId: string): CoinApiInfo | undefined {
  const meta = STANDARD_API_META[networkId]
  if (!meta) return undefined
  const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || 'https://api.metayoshi.app').trim().replace(/\/+$/, '')
  const bridgePath = resolveDefaultBridgePath(meta.coinId)
  return {
    networkId,
    symbol: meta.symbol,
    coinId: meta.coinId,
    chain: 'main',
    protocol: 'utxo-jsonrpc',
    apiBaseUrl,
    defaultRpcUrl: apiBaseUrl,
    defaultBridgeUrl: `${apiBaseUrl}${bridgePath}`,
    defaultWallet: meta.coinId === 'raptoreum' || meta.coinId === 'xrp' ? 'mainwallet' : '',
    defaultExplorerUrl: '',
    healthUrl: `${apiBaseUrl}/health`,
    bridgeMethodsUrl: `${apiBaseUrl}/v1/bridge/methods/${meta.coinId}`,
    sendCoinPathTemplate: `/v1/bridge/send/coin/${meta.coinId}/main/:wallet`,
    sendAssetPathTemplate: `/v1/bridge/send/asset/${meta.coinId}/main/:wallet`,
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
  DOGE_API_INFO,
  TIDE_API_INFO,
  BTCZ_API_INFO,
  FIRO_API_INFO,
  XRP_API_INFO,
  ARR_API_INFO,
  XMR_API_INFO,
  ADA_API_INFO
}

export type { CoinApiInfo, CoinApiInterceptor } from './types'
