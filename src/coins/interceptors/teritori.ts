import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { TERITORI_PAYLOADS } from '../payloads/teritori'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const TERITORI_API_INFO: CoinApiInfo = {
  networkId: 'srv--teritori',
  symbol: 'TERITO',
  coinId: 'teritori',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/teritori/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/teritori',
  sendCoinPathTemplate: '/v1/bridge/send/coin/teritori/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/teritori/main/:wallet',
  payloads: TERITORI_PAYLOADS
}

export const teritoriApiInterceptor = createCoinApiInterceptor(TERITORI_API_INFO)
