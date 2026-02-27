import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { CHILIZSPICY_PAYLOADS } from '../payloads/chiliz-spicy'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const CHILIZSPICY_API_INFO: CoinApiInfo = {
  networkId: 'srv--chiliz-spicy',
  symbol: 'CHILIZ',
  coinId: 'chiliz-spicy',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/chiliz-spicy/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/chiliz-spicy',
  sendCoinPathTemplate: '/v1/bridge/send/coin/chiliz-spicy/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/chiliz-spicy/main/:wallet',
  payloads: CHILIZSPICY_PAYLOADS
}

export const chilizSpicyApiInterceptor = createCoinApiInterceptor(CHILIZSPICY_API_INFO)
