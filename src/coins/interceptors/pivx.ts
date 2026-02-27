import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { PIVX_PAYLOADS } from '../payloads/pivx'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const PIVX_API_INFO: CoinApiInfo = {
  networkId: 'srv--pivx',
  symbol: 'PIVX',
  coinId: 'pivx',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/pivx/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/pivx',
  sendCoinPathTemplate: '/v1/bridge/send/coin/pivx/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/pivx/main/:wallet',
  payloads: PIVX_PAYLOADS
}

export const pivxApiInterceptor = createCoinApiInterceptor(PIVX_API_INFO)
