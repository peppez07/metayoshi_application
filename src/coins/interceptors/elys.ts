import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { ELYS_PAYLOADS } from '../payloads/elys'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const ELYS_API_INFO: CoinApiInfo = {
  networkId: 'srv--elys',
  symbol: 'ELYS',
  coinId: 'elys',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/elys/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/elys',
  sendCoinPathTemplate: '/v1/bridge/send/coin/elys/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/elys/main/:wallet',
  payloads: ELYS_PAYLOADS
}

export const elysApiInterceptor = createCoinApiInterceptor(ELYS_API_INFO)
