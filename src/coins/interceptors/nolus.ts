import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { NOLUS_PAYLOADS } from '../payloads/nolus'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const NOLUS_API_INFO: CoinApiInfo = {
  networkId: 'srv--nolus',
  symbol: 'NOLUS',
  coinId: 'nolus',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/nolus/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/nolus',
  sendCoinPathTemplate: '/v1/bridge/send/coin/nolus/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/nolus/main/:wallet',
  payloads: NOLUS_PAYLOADS
}

export const nolusApiInterceptor = createCoinApiInterceptor(NOLUS_API_INFO)
