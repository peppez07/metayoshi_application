import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { OSMOSIS_PAYLOADS } from '../payloads/osmosis'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const OSMOSIS_API_INFO: CoinApiInfo = {
  networkId: 'srv--osmosis',
  symbol: 'OSMOSI',
  coinId: 'osmosis',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/osmosis/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/osmosis',
  sendCoinPathTemplate: '/v1/bridge/send/coin/osmosis/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/osmosis/main/:wallet',
  payloads: OSMOSIS_PAYLOADS
}

export const osmosisApiInterceptor = createCoinApiInterceptor(OSMOSIS_API_INFO)
