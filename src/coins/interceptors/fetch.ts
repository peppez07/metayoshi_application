import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { FETCH_PAYLOADS } from '../payloads/fetch'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const FETCH_API_INFO: CoinApiInfo = {
  networkId: 'srv--fetch',
  symbol: 'FETCH',
  coinId: 'fetch',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/fetch/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/fetch',
  sendCoinPathTemplate: '/v1/bridge/send/coin/fetch/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/fetch/main/:wallet',
  payloads: FETCH_PAYLOADS
}

export const fetchApiInterceptor = createCoinApiInterceptor(FETCH_API_INFO)
