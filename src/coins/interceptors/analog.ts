import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { ANALOG_PAYLOADS } from '../payloads/analog'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const ANALOG_API_INFO: CoinApiInfo = {
  networkId: 'srv--analog',
  symbol: 'ANALOG',
  coinId: 'analog',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/analog/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/analog',
  sendCoinPathTemplate: '/v1/bridge/send/coin/analog/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/analog/main/:wallet',
  payloads: ANALOG_PAYLOADS
}

export const analogApiInterceptor = createCoinApiInterceptor(ANALOG_API_INFO)
