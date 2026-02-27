import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { SHENTU_PAYLOADS } from '../payloads/shentu'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const SHENTU_API_INFO: CoinApiInfo = {
  networkId: 'srv--shentu',
  symbol: 'SHENTU',
  coinId: 'shentu',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/shentu/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/shentu',
  sendCoinPathTemplate: '/v1/bridge/send/coin/shentu/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/shentu/main/:wallet',
  payloads: SHENTU_PAYLOADS
}

export const shentuApiInterceptor = createCoinApiInterceptor(SHENTU_API_INFO)
