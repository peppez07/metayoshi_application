import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { LAVA_PAYLOADS } from '../payloads/lava'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const LAVA_API_INFO: CoinApiInfo = {
  networkId: 'srv--lava',
  symbol: 'LAVA',
  coinId: 'lava',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/lava/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/lava',
  sendCoinPathTemplate: '/v1/bridge/send/coin/lava/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/lava/main/:wallet',
  payloads: LAVA_PAYLOADS
}

export const lavaApiInterceptor = createCoinApiInterceptor(LAVA_API_INFO)
