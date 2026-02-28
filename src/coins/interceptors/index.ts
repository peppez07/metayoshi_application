import { createCoinApiInterceptor } from './factory'
import { getCoinPayloadCatalog } from '../payloads'
import { STANDARD_RUNTIME_META } from '../standardRuntimeMeta'
import { getPackedCoinFeatureByCoinId, getPackedCoinFeatureByNetworkId } from '../packed'
import type { CoinApiInfo, CoinApiInterceptor, CoinRpcProtocol } from './types'

function normalizeRegistryNetworkId(networkId?: string): string {
  return String(networkId || '').trim().toLowerCase()
}

function resolvePackedFeature(networkId?: string) {
  const key = normalizeRegistryNetworkId(networkId)
  if (!key) return null

  const directByNetwork = getPackedCoinFeatureByNetworkId(key)
  if (directByNetwork) return directByNetwork

  const directByCoin = getPackedCoinFeatureByCoinId(key)
  if (directByCoin) return directByCoin

  if (key.startsWith('srv--')) {
    const srvCoinId = key.slice('srv--'.length)
    if (srvCoinId) {
      const bySrvCoin = getPackedCoinFeatureByCoinId(srvCoinId)
      if (bySrvCoin) return bySrvCoin
    }
  }

  const aliasSep = key.lastIndexOf('--')
  if (aliasSep > 0 && aliasSep < key.length - 2) {
    const suffix = key.slice(aliasSep + 2)
    const bySuffixNetwork = getPackedCoinFeatureByNetworkId(suffix)
    if (bySuffixNetwork) return bySuffixNetwork
    const bySuffixCoin = getPackedCoinFeatureByCoinId(suffix)
    if (bySuffixCoin) return bySuffixCoin
    const byPrefixNetwork = getPackedCoinFeatureByNetworkId(key.slice(0, aliasSep))
    if (byPrefixNetwork) return byPrefixNetwork
  }

  const standardMeta = STANDARD_RUNTIME_META[key]
  if (standardMeta?.coinId) {
    const byStandard = getPackedCoinFeatureByCoinId(standardMeta.coinId)
    if (byStandard) return byStandard
  }

  return null
}

function resolveProtocol(feature: any): CoinRpcProtocol {
  const coinType = String(feature?.coinType || '').trim().toUpperCase()
  if (coinType === 'EVM') return 'evm-jsonrpc'
  if (coinType === 'XRP') return 'xrp-jsonrpc-compat'
  if (coinType === 'ADA') return 'cardano-wallet-compat'
  if (coinType === 'XMR') return 'monero-wallet-compat'
  return 'utxo-jsonrpc'
}

function defaultWalletForFeature(feature: any): string {
  const walletScoped = Boolean(feature?.settings?.bridge?.walletScopedPath)
  return walletScoped ? 'mainwallet' : ''
}

function createApiInfoFromPacked(feature: any, requestedNetworkId: string): CoinApiInfo {
  const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || 'https://api.metayoshi.app').trim().replace(/\/+$/, '')
  const coinId = String(feature?.bridgeCoinId || feature?.coinId || requestedNetworkId || '').trim().toLowerCase() || requestedNetworkId
  const chain = String(feature?.settings?.bridge?.chain || 'main').trim().toLowerCase() === 'test' ? 'test' : 'main'
  const wallet = defaultWalletForFeature(feature)
  const bridgeBasePath = `/v1/bridge/${coinId}/${chain}`
  const defaultBridgePath = wallet ? `${bridgeBasePath}/wallet/${encodeURIComponent(wallet)}` : bridgeBasePath

  return {
    networkId: String(requestedNetworkId || feature?.networkId || feature?.coinId || '').trim().toLowerCase(),
    symbol: String(feature?.symbol || 'COIN').trim().toUpperCase(),
    coinId,
    chain,
    protocol: resolveProtocol(feature),
    apiBaseUrl,
    defaultRpcUrl: apiBaseUrl,
    defaultBridgeUrl: `${apiBaseUrl}${defaultBridgePath}`,
    defaultWallet: wallet,
    defaultExplorerUrl: String(feature?.settings?.explorer?.txUrlTemplate || '').trim(),
    healthUrl: `${apiBaseUrl}/health`,
    bridgeMethodsUrl: `${apiBaseUrl}/v1/bridge/methods/${coinId}`,
    sendCoinPathTemplate: `${bridgeBasePath}${wallet ? '/:wallet' : ''}`,
    sendAssetPathTemplate: `/v1/bridge/send/asset/${coinId}/${chain}${wallet ? '/:wallet' : ''}`,
    payloads: getCoinPayloadCatalog(requestedNetworkId)
  }
}

const DYNAMIC_API_INFO_CACHE = new Map<string, CoinApiInfo>()
const DYNAMIC_INTERCEPTOR_CACHE = new Map<string, CoinApiInterceptor>()

export function getCoinApiInfo(networkId?: string): CoinApiInfo | undefined {
  const key = normalizeRegistryNetworkId(networkId)
  if (!key) return undefined

  const cached = DYNAMIC_API_INFO_CACHE.get(key)
  if (cached) return cached

  const feature = resolvePackedFeature(key)
  if (!feature) return undefined

  const info = createApiInfoFromPacked(feature, key)
  DYNAMIC_API_INFO_CACHE.set(key, info)
  return info
}

export function getCoinApiInterceptor(networkId?: string): CoinApiInterceptor | undefined {
  const key = normalizeRegistryNetworkId(networkId)
  if (!key) return undefined

  const cached = DYNAMIC_INTERCEPTOR_CACHE.get(key)
  if (cached) return cached

  const info = getCoinApiInfo(key)
  if (!info) return undefined

  const interceptor = createCoinApiInterceptor(info)
  DYNAMIC_INTERCEPTOR_CACHE.set(key, interceptor)
  return interceptor
}

function mustApiInfo(networkId: string): CoinApiInfo {
  const value = getCoinApiInfo(networkId)
  if (!value) {
    throw new Error(`Missing API info for networkId=${networkId}`)
  }
  return value
}

export const RTM_API_INFO = mustApiInfo('rtm')
export const DOGE_API_INFO = mustApiInfo('doge')
export const TIDE_API_INFO = mustApiInfo('tide')
export const BTCZ_API_INFO = mustApiInfo('btcz')
export const FIRO_API_INFO = mustApiInfo('firo')
export const XRP_API_INFO = mustApiInfo('xrp')
export const ARR_API_INFO = mustApiInfo('arr')
export const XMR_API_INFO = mustApiInfo('xmr')
export const ADA_API_INFO = mustApiInfo('ada')
export const DASH_API_INFO = mustApiInfo('srv--dash')

export type { CoinApiInfo, CoinApiInterceptor } from './types'
