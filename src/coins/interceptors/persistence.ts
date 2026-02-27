import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { PERSISTENCE_PAYLOADS } from '../payloads/persistence'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const PERSISTENCE_API_INFO: CoinApiInfo = {
  networkId: 'srv--persistence',
  symbol: 'PERSIS',
  coinId: 'persistence',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/persistence/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/persistence',
  sendCoinPathTemplate: '/v1/bridge/send/coin/persistence/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/persistence/main/:wallet',
  payloads: PERSISTENCE_PAYLOADS
}

export const persistenceApiInterceptor = createCoinApiInterceptor(PERSISTENCE_API_INFO)
