import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { AVAIL_PAYLOADS } from '../payloads/avail'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const AVAIL_API_INFO: CoinApiInfo = {
  networkId: 'srv--avail',
  symbol: 'AVAIL',
  coinId: 'avail',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/avail/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/avail',
  sendCoinPathTemplate: '/v1/bridge/send/coin/avail/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/avail/main/:wallet',
  payloads: AVAIL_PAYLOADS
}

export const availApiInterceptor = createCoinApiInterceptor(AVAIL_API_INFO)
