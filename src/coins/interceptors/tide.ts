import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { TIDE_PAYLOADS } from '../payloads'

// TIDE mainnet API profile and transport interceptor.
const DEFAULT_API_BASE = 'https://tide.metayoshi.app'

const apiBaseUrl = String(import.meta.env.VITE_TIDE_RPC || DEFAULT_API_BASE).trim().replace(/\/+$/, '')
const defaultBridgeUrl = String(import.meta.env.VITE_TIDE_BRIDGE_URL || `${apiBaseUrl}/v1/bridge`).trim()

export const TIDE_API_INFO: CoinApiInfo = {
  networkId: 'tide',
  symbol: 'TIDE',
  coinId: 'tidecoin',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl,
  defaultExplorerUrl: '',
  healthUrl: `${apiBaseUrl}/health`,
  bridgeMethodsUrl: `${apiBaseUrl}/v1/bridge/methods/tidecoin`,
  sendCoinPathTemplate: '/v1/bridge/send/coin/tidecoin/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/tidecoin/main/:wallet',
  payloads: TIDE_PAYLOADS
}

export const tideApiInterceptor = createCoinApiInterceptor(TIDE_API_INFO)
