import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { INJECTIVETESTNET_PAYLOADS } from '../payloads/injective-testnet'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const INJECTIVETESTNET_API_INFO: CoinApiInfo = {
  networkId: 'srv--injective-testnet',
  symbol: 'INJECT',
  coinId: 'injective-testnet',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/injective-testnet/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/injective-testnet',
  sendCoinPathTemplate: '/v1/bridge/send/coin/injective-testnet/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/injective-testnet/main/:wallet',
  payloads: INJECTIVETESTNET_PAYLOADS
}

export const injectiveTestnetApiInterceptor = createCoinApiInterceptor(INJECTIVETESTNET_API_INFO)
