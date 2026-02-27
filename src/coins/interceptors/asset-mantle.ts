import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { ASSETMANTLE_PAYLOADS } from '../payloads/asset-mantle'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const ASSETMANTLE_API_INFO: CoinApiInfo = {
  networkId: 'srv--asset-mantle',
  symbol: 'ASSETM',
  coinId: 'asset-mantle',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/asset-mantle/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/asset-mantle',
  sendCoinPathTemplate: '/v1/bridge/send/coin/asset-mantle/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/asset-mantle/main/:wallet',
  payloads: ASSETMANTLE_PAYLOADS
}

export const assetMantleApiInterceptor = createCoinApiInterceptor(ASSETMANTLE_API_INFO)
