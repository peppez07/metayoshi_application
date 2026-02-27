import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { METISSEPOLIA_PAYLOADS } from '../payloads/metis-sepolia'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const METISSEPOLIA_API_INFO: CoinApiInfo = {
  networkId: 'srv--metis-sepolia',
  symbol: 'METISS',
  coinId: 'metis-sepolia',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/metis-sepolia/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/metis-sepolia',
  sendCoinPathTemplate: '/v1/bridge/send/coin/metis-sepolia/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/metis-sepolia/main/:wallet',
  payloads: METISSEPOLIA_PAYLOADS
}

export const metisSepoliaApiInterceptor = createCoinApiInterceptor(METISSEPOLIA_API_INFO)
