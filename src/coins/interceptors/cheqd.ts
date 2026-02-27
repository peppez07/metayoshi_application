import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { CHEQD_PAYLOADS } from '../payloads/cheqd'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const CHEQD_API_INFO: CoinApiInfo = {
  networkId: 'srv--cheqd',
  symbol: 'CHEQD',
  coinId: 'cheqd',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/cheqd/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/cheqd',
  sendCoinPathTemplate: '/v1/bridge/send/coin/cheqd/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/cheqd/main/:wallet',
  payloads: CHEQD_PAYLOADS
}

export const cheqdApiInterceptor = createCoinApiInterceptor(CHEQD_API_INFO)
