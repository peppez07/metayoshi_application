import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { OPTIMISMSEPOLIA_PAYLOADS } from '../payloads/optimism-sepolia'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const OPTIMISMSEPOLIA_API_INFO: CoinApiInfo = {
  networkId: 'srv--optimism-sepolia',
  symbol: 'OPTIMI',
  coinId: 'optimism-sepolia',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/optimism-sepolia/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/optimism-sepolia',
  sendCoinPathTemplate: '/v1/bridge/send/coin/optimism-sepolia/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/optimism-sepolia/main/:wallet',
  payloads: OPTIMISMSEPOLIA_PAYLOADS
}

export const optimismSepoliaApiInterceptor = createCoinApiInterceptor(OPTIMISMSEPOLIA_API_INFO)
