import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { CELER_PAYLOADS } from '../payloads/celer'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const CELER_API_INFO: CoinApiInfo = {
  networkId: 'srv--celer',
  symbol: 'CELER',
  coinId: 'celer',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/celer/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/celer',
  sendCoinPathTemplate: '/v1/bridge/send/coin/celer/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/celer/main/:wallet',
  payloads: CELER_PAYLOADS
}

export const celerApiInterceptor = createCoinApiInterceptor(CELER_API_INFO)
