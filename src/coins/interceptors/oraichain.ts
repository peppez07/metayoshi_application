import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { ORAICHAIN_PAYLOADS } from '../payloads/oraichain'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const ORAICHAIN_API_INFO: CoinApiInfo = {
  networkId: 'srv--oraichain',
  symbol: 'ORAICH',
  coinId: 'oraichain',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/oraichain/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/oraichain',
  sendCoinPathTemplate: '/v1/bridge/send/coin/oraichain/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/oraichain/main/:wallet',
  payloads: ORAICHAIN_PAYLOADS
}

export const oraichainApiInterceptor = createCoinApiInterceptor(ORAICHAIN_API_INFO)
