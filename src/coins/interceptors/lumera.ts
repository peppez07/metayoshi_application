import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { LUMERA_PAYLOADS } from '../payloads/lumera'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const LUMERA_API_INFO: CoinApiInfo = {
  networkId: 'srv--lumera',
  symbol: 'LUMERA',
  coinId: 'lumera',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/lumera/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/lumera',
  sendCoinPathTemplate: '/v1/bridge/send/coin/lumera/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/lumera/main/:wallet',
  payloads: LUMERA_PAYLOADS
}

export const lumeraApiInterceptor = createCoinApiInterceptor(LUMERA_API_INFO)
