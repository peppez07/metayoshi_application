import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { MEDIBLOC_PAYLOADS } from '../payloads/medibloc'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const MEDIBLOC_API_INFO: CoinApiInfo = {
  networkId: 'srv--medibloc',
  symbol: 'MEDIBL',
  coinId: 'medibloc',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/medibloc/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/medibloc',
  sendCoinPathTemplate: '/v1/bridge/send/coin/medibloc/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/medibloc/main/:wallet',
  payloads: MEDIBLOC_PAYLOADS
}

export const mediblocApiInterceptor = createCoinApiInterceptor(MEDIBLOC_API_INFO)
