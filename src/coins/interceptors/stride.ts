import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { STRIDE_PAYLOADS } from '../payloads/stride'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const STRIDE_API_INFO: CoinApiInfo = {
  networkId: 'srv--stride',
  symbol: 'STRIDE',
  coinId: 'stride',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/stride/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/stride',
  sendCoinPathTemplate: '/v1/bridge/send/coin/stride/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/stride/main/:wallet',
  payloads: STRIDE_PAYLOADS
}

export const strideApiInterceptor = createCoinApiInterceptor(STRIDE_API_INFO)
