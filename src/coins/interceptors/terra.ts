import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { TERRA_PAYLOADS } from '../payloads'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')
const defaultBridgeUrl = `${apiBaseUrl}/v1/bridge/terra/main`

export const TERRA_API_INFO: CoinApiInfo = {
  networkId: 'srv--terra',
  symbol: 'LUNA',
  coinId: 'terra',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl,
  defaultExplorerUrl: '',
  healthUrl: `${apiBaseUrl}/health`,
  bridgeMethodsUrl: `${apiBaseUrl}/v1/bridge/methods/terra`,
  sendCoinPathTemplate: '/v1/bridge/send/coin/terra/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/terra/main/:wallet',
  payloads: TERRA_PAYLOADS
}

export const terraApiInterceptor = createCoinApiInterceptor(TERRA_API_INFO)
