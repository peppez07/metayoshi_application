import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { DYDX_PAYLOADS } from '../payloads/dydx'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const DYDX_API_INFO: CoinApiInfo = {
  networkId: 'srv--dydx',
  symbol: 'DYDX',
  coinId: 'dydx',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/dydx/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/dydx',
  sendCoinPathTemplate: '/v1/bridge/send/coin/dydx/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/dydx/main/:wallet',
  payloads: DYDX_PAYLOADS
}

export const dydxApiInterceptor = createCoinApiInterceptor(DYDX_API_INFO)
