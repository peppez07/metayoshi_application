import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { POLYGONAMOYBOR_PAYLOADS } from '../payloads/polygon-amoy-bor'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const POLYGONAMOYBOR_API_INFO: CoinApiInfo = {
  networkId: 'srv--polygon-amoy-bor',
  symbol: 'POLYGO',
  coinId: 'polygon-amoy-bor',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/polygon-amoy-bor/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/polygon-amoy-bor',
  sendCoinPathTemplate: '/v1/bridge/send/coin/polygon-amoy-bor/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/polygon-amoy-bor/main/:wallet',
  payloads: POLYGONAMOYBOR_PAYLOADS
}

export const polygonAmoyBorApiInterceptor = createCoinApiInterceptor(POLYGONAMOYBOR_API_INFO)
