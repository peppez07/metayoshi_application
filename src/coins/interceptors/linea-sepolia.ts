import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { LINEASEPOLIA_PAYLOADS } from '../payloads/linea-sepolia'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const LINEASEPOLIA_API_INFO: CoinApiInfo = {
  networkId: 'srv--linea-sepolia',
  symbol: 'LINEAS',
  coinId: 'linea-sepolia',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/linea-sepolia/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/linea-sepolia',
  sendCoinPathTemplate: '/v1/bridge/send/coin/linea-sepolia/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/linea-sepolia/main/:wallet',
  payloads: LINEASEPOLIA_PAYLOADS
}

export const lineaSepoliaApiInterceptor = createCoinApiInterceptor(LINEASEPOLIA_API_INFO)
