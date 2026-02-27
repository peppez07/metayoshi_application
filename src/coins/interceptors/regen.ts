import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { REGEN_PAYLOADS } from '../payloads/regen'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const REGEN_API_INFO: CoinApiInfo = {
  networkId: 'srv--regen',
  symbol: 'REGEN',
  coinId: 'regen',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/regen/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/regen',
  sendCoinPathTemplate: '/v1/bridge/send/coin/regen/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/regen/main/:wallet',
  payloads: REGEN_PAYLOADS
}

export const regenApiInterceptor = createCoinApiInterceptor(REGEN_API_INFO)
