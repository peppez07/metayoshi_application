import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { COMDEX_PAYLOADS } from '../payloads/comdex'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const COMDEX_API_INFO: CoinApiInfo = {
  networkId: 'srv--comdex',
  symbol: 'COMDEX',
  coinId: 'comdex',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/comdex/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/comdex',
  sendCoinPathTemplate: '/v1/bridge/send/coin/comdex/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/comdex/main/:wallet',
  payloads: COMDEX_PAYLOADS
}

export const comdexApiInterceptor = createCoinApiInterceptor(COMDEX_API_INFO)
