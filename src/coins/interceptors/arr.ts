import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { ARR_PAYLOADS } from '../payloads'

// ARRR mainnet API profile and transport interceptor.
const DEFAULT_API_BASE = 'https://arrr.metayoshi.app'

const apiBaseUrl = String(import.meta.env.VITE_ARR_RPC || DEFAULT_API_BASE).trim().replace(/\/+$/, '')
const defaultBridgeUrl = String(import.meta.env.VITE_ARR_BRIDGE_URL || `${apiBaseUrl}/v1/bridge`).trim()

export const ARR_API_INFO: CoinApiInfo = {
  networkId: 'arr',
  symbol: 'ARRR',
  coinId: 'arr',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl,
  defaultExplorerUrl: 'https://arrr.explorer.dexstats.info',
  healthUrl: `${apiBaseUrl}/health`,
  bridgeMethodsUrl: `${apiBaseUrl}/v1/bridge/methods/arr`,
  sendCoinPathTemplate: '/v1/bridge/send/coin/arr/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/arr/main/:wallet',
  payloads: ARR_PAYLOADS
}

export const arrApiInterceptor = createCoinApiInterceptor(ARR_API_INFO)
