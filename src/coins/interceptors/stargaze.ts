import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { STARGAZE_PAYLOADS } from '../payloads/stargaze'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const STARGAZE_API_INFO: CoinApiInfo = {
  networkId: 'srv--stargaze',
  symbol: 'STARGA',
  coinId: 'stargaze',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/stargaze/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/stargaze',
  sendCoinPathTemplate: '/v1/bridge/send/coin/stargaze/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/stargaze/main/:wallet',
  payloads: STARGAZE_PAYLOADS
}

export const stargazeApiInterceptor = createCoinApiInterceptor(STARGAZE_API_INFO)
