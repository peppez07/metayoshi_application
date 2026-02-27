import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { PEAQ_PAYLOADS } from '../payloads/peaq'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const PEAQ_API_INFO: CoinApiInfo = {
  networkId: 'srv--peaq',
  symbol: 'PEAQ',
  coinId: 'peaq',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/peaq/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/peaq',
  sendCoinPathTemplate: '/v1/bridge/send/coin/peaq/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/peaq/main/:wallet',
  payloads: PEAQ_PAYLOADS
}

export const peaqApiInterceptor = createCoinApiInterceptor(PEAQ_API_INFO)
