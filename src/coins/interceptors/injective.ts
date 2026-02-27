import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { INJECTIVE_PAYLOADS } from '../payloads/injective'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const INJECTIVE_API_INFO: CoinApiInfo = {
  networkId: 'srv--injective',
  symbol: 'INJECT',
  coinId: 'injective',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/injective/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/injective',
  sendCoinPathTemplate: '/v1/bridge/send/coin/injective/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/injective/main/:wallet',
  payloads: INJECTIVE_PAYLOADS
}

export const injectiveApiInterceptor = createCoinApiInterceptor(INJECTIVE_API_INFO)
