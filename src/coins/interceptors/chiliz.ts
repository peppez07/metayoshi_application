import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { CHILIZ_PAYLOADS } from '../payloads/chiliz'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const CHILIZ_API_INFO: CoinApiInfo = {
  networkId: 'srv--chiliz',
  symbol: 'CHILIZ',
  coinId: 'chiliz',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/chiliz/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/chiliz',
  sendCoinPathTemplate: '/v1/bridge/send/coin/chiliz/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/chiliz/main/:wallet',
  payloads: CHILIZ_PAYLOADS
}

export const chilizApiInterceptor = createCoinApiInterceptor(CHILIZ_API_INFO)
