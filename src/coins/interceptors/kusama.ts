import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { KUSAMA_PAYLOADS } from '../payloads/kusama'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const KUSAMA_API_INFO: CoinApiInfo = {
  networkId: 'srv--kusama',
  symbol: 'KUSAMA',
  coinId: 'kusama',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/kusama/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/kusama',
  sendCoinPathTemplate: '/v1/bridge/send/coin/kusama/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/kusama/main/:wallet',
  payloads: KUSAMA_PAYLOADS
}

export const kusamaApiInterceptor = createCoinApiInterceptor(KUSAMA_API_INFO)
