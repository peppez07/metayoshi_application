import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { CELESTIA_PAYLOADS } from '../payloads/celestia'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const CELESTIA_API_INFO: CoinApiInfo = {
  networkId: 'srv--celestia',
  symbol: 'CELEST',
  coinId: 'celestia',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/celestia/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/celestia',
  sendCoinPathTemplate: '/v1/bridge/send/coin/celestia/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/celestia/main/:wallet',
  payloads: CELESTIA_PAYLOADS
}

export const celestiaApiInterceptor = createCoinApiInterceptor(CELESTIA_API_INFO)
