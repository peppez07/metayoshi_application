import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { CRONOSPOS_PAYLOADS } from '../payloads/cronos-pos'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const CRONOSPOS_API_INFO: CoinApiInfo = {
  networkId: 'srv--cronos-pos',
  symbol: 'CRONOS',
  coinId: 'cronos-pos',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/cronos-pos/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/cronos-pos',
  sendCoinPathTemplate: '/v1/bridge/send/coin/cronos-pos/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/cronos-pos/main/:wallet',
  payloads: CRONOSPOS_PAYLOADS
}

export const cronosPosApiInterceptor = createCoinApiInterceptor(CRONOSPOS_API_INFO)
