import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { KUJIRA_PAYLOADS } from '../payloads/kujira'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const KUJIRA_API_INFO: CoinApiInfo = {
  networkId: 'srv--kujira',
  symbol: 'KUJIRA',
  coinId: 'kujira',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/kujira/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/kujira',
  sendCoinPathTemplate: '/v1/bridge/send/coin/kujira/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/kujira/main/:wallet',
  payloads: KUJIRA_PAYLOADS
}

export const kujiraApiInterceptor = createCoinApiInterceptor(KUJIRA_API_INFO)
