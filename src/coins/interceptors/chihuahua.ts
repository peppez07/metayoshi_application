import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { CHIHUAHUA_PAYLOADS } from '../payloads/chihuahua'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const CHIHUAHUA_API_INFO: CoinApiInfo = {
  networkId: 'srv--chihuahua',
  symbol: 'CHIHUA',
  coinId: 'chihuahua',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/chihuahua/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/chihuahua',
  sendCoinPathTemplate: '/v1/bridge/send/coin/chihuahua/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/chihuahua/main/:wallet',
  payloads: CHIHUAHUA_PAYLOADS
}

export const chihuahuaApiInterceptor = createCoinApiInterceptor(CHIHUAHUA_API_INFO)
