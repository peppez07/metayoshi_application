import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { SCROLLSEPOLIA_PAYLOADS } from '../payloads/scroll-sepolia'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const SCROLLSEPOLIA_API_INFO: CoinApiInfo = {
  networkId: 'srv--scroll-sepolia',
  symbol: 'SCROLL',
  coinId: 'scroll-sepolia',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/scroll-sepolia/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/scroll-sepolia',
  sendCoinPathTemplate: '/v1/bridge/send/coin/scroll-sepolia/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/scroll-sepolia/main/:wallet',
  payloads: SCROLLSEPOLIA_PAYLOADS
}

export const scrollSepoliaApiInterceptor = createCoinApiInterceptor(SCROLLSEPOLIA_API_INFO)
