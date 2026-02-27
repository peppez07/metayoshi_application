import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { UNICHAINSEPOLIA_PAYLOADS } from '../payloads/unichain-sepolia'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const UNICHAINSEPOLIA_API_INFO: CoinApiInfo = {
  networkId: 'srv--unichain-sepolia',
  symbol: 'UNICHA',
  coinId: 'unichain-sepolia',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/unichain-sepolia/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/unichain-sepolia',
  sendCoinPathTemplate: '/v1/bridge/send/coin/unichain-sepolia/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/unichain-sepolia/main/:wallet',
  payloads: UNICHAINSEPOLIA_PAYLOADS
}

export const unichainSepoliaApiInterceptor = createCoinApiInterceptor(UNICHAINSEPOLIA_API_INFO)
