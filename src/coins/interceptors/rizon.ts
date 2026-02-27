import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { RIZON_PAYLOADS } from '../payloads/rizon'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const RIZON_API_INFO: CoinApiInfo = {
  networkId: 'srv--rizon',
  symbol: 'RIZON',
  coinId: 'rizon',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/rizon/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/rizon',
  sendCoinPathTemplate: '/v1/bridge/send/coin/rizon/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/rizon/main/:wallet',
  payloads: RIZON_PAYLOADS
}

export const rizonApiInterceptor = createCoinApiInterceptor(RIZON_API_INFO)
