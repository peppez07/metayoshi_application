import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { BITCANNA_PAYLOADS } from '../payloads/bitcanna'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const BITCANNA_API_INFO: CoinApiInfo = {
  networkId: 'srv--bitcanna',
  symbol: 'BITCAN',
  coinId: 'bitcanna',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/bitcanna/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/bitcanna',
  sendCoinPathTemplate: '/v1/bridge/send/coin/bitcanna/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/bitcanna/main/:wallet',
  payloads: BITCANNA_PAYLOADS
}

export const bitcannaApiInterceptor = createCoinApiInterceptor(BITCANNA_API_INFO)
