import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { BASESEPOLIA_PAYLOADS } from '../payloads/base-sepolia'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const BASESEPOLIA_API_INFO: CoinApiInfo = {
  networkId: 'srv--base-sepolia',
  symbol: 'BASESE',
  coinId: 'base-sepolia',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/base-sepolia/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/base-sepolia',
  sendCoinPathTemplate: '/v1/bridge/send/coin/base-sepolia/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/base-sepolia/main/:wallet',
  payloads: BASESEPOLIA_PAYLOADS
}

export const baseSepoliaApiInterceptor = createCoinApiInterceptor(BASESEPOLIA_API_INFO)
