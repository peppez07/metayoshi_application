import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { SENTINEL_PAYLOADS } from '../payloads/sentinel'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const SENTINEL_API_INFO: CoinApiInfo = {
  networkId: 'srv--sentinel',
  symbol: 'SENTIN',
  coinId: 'sentinel',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/sentinel/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/sentinel',
  sendCoinPathTemplate: '/v1/bridge/send/coin/sentinel/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/sentinel/main/:wallet',
  payloads: SENTINEL_PAYLOADS
}

export const sentinelApiInterceptor = createCoinApiInterceptor(SENTINEL_API_INFO)
