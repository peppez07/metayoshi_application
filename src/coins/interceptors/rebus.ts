import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { REBUS_PAYLOADS } from '../payloads/rebus'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const REBUS_API_INFO: CoinApiInfo = {
  networkId: 'srv--rebus',
  symbol: 'REBUS',
  coinId: 'rebus',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/rebus/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/rebus',
  sendCoinPathTemplate: '/v1/bridge/send/coin/rebus/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/rebus/main/:wallet',
  payloads: REBUS_PAYLOADS
}

export const rebusApiInterceptor = createCoinApiInterceptor(REBUS_API_INFO)
