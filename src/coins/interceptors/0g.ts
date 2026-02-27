import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { C0G_PAYLOADS } from '../payloads/0g'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const C0G_API_INFO: CoinApiInfo = {
  networkId: 'srv--0g',
  symbol: '0G',
  coinId: '0g',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/0g/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/0g',
  sendCoinPathTemplate: '/v1/bridge/send/coin/0g/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/0g/main/:wallet',
  payloads: C0G_PAYLOADS
}

export const c0gApiInterceptor = createCoinApiInterceptor(C0G_API_INFO)
