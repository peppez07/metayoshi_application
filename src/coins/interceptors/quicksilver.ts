import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { QUICKSILVER_PAYLOADS } from '../payloads/quicksilver'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const QUICKSILVER_API_INFO: CoinApiInfo = {
  networkId: 'srv--quicksilver',
  symbol: 'QUICKS',
  coinId: 'quicksilver',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/quicksilver/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/quicksilver',
  sendCoinPathTemplate: '/v1/bridge/send/coin/quicksilver/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/quicksilver/main/:wallet',
  payloads: QUICKSILVER_PAYLOADS
}

export const quicksilverApiInterceptor = createCoinApiInterceptor(QUICKSILVER_API_INFO)
