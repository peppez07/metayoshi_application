import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { BITWAY_PAYLOADS } from '../payloads/bitway'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const BITWAY_API_INFO: CoinApiInfo = {
  networkId: 'srv--bitway',
  symbol: 'BITWAY',
  coinId: 'bitway',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/bitway/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/bitway',
  sendCoinPathTemplate: '/v1/bridge/send/coin/bitway/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/bitway/main/:wallet',
  payloads: BITWAY_PAYLOADS
}

export const bitwayApiInterceptor = createCoinApiInterceptor(BITWAY_API_INFO)
