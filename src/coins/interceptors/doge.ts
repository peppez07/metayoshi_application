import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { DOGE_PAYLOADS } from '../payloads'

// DOGE mainnet API profile and transport interceptor.
const DEFAULT_API_BASE = 'https://doge.metayoshi.app'

const apiBaseUrl = String(import.meta.env.VITE_DOGE_RPC || DEFAULT_API_BASE).trim().replace(/\/+$/, '')
const defaultBridgeUrl = String(import.meta.env.VITE_DOGE_BRIDGE_URL || `${apiBaseUrl}/v1/bridge`).trim()

export const DOGE_API_INFO: CoinApiInfo = {
  networkId: 'doge',
  symbol: 'DOGE',
  coinId: 'dogecoin',
  chain: 'main',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl,
  defaultExplorerUrl: 'https://dogechain.info',
  healthUrl: `${apiBaseUrl}/health`,
  bridgeMethodsUrl: `${apiBaseUrl}/v1/bridge/methods/dogecoin`,
  sendCoinPathTemplate: '/v1/bridge/send/coin/dogecoin/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/dogecoin/main/:wallet',
  payloads: DOGE_PAYLOADS
}

export const dogeApiInterceptor = createCoinApiInterceptor(DOGE_API_INFO)
