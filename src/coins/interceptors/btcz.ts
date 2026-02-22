import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { BTCZ_PAYLOADS } from '../payloads'

// BTCZ mainnet API profile and transport interceptor.
const DEFAULT_API_BASE = 'https://btcz.metayoshi.app'

const apiBaseUrl = String(import.meta.env.VITE_BTCZ_RPC || DEFAULT_API_BASE).trim().replace(/\/+$/, '')
const defaultBridgeUrl = String(import.meta.env.VITE_BTCZ_BRIDGE_URL || `${apiBaseUrl}/v1/bridge`).trim()

export const BTCZ_API_INFO: CoinApiInfo = {
  networkId: 'btcz',
  symbol: 'BTCZ',
  coinId: 'bitcoinz',
  chain: 'main',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl,
  defaultExplorerUrl: 'https://explorer.btcz.rocks',
  healthUrl: `${apiBaseUrl}/health`,
  bridgeMethodsUrl: `${apiBaseUrl}/v1/bridge/methods/bitcoinz`,
  sendCoinPathTemplate: '/v1/bridge/send/coin/bitcoinz/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/bitcoinz/main/:wallet',
  payloads: BTCZ_PAYLOADS
}

export const btczApiInterceptor = createCoinApiInterceptor(BTCZ_API_INFO)
