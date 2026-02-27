import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { TAIKOHOODI_PAYLOADS } from '../payloads/taiko-hoodi'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const TAIKOHOODI_API_INFO: CoinApiInfo = {
  networkId: 'srv--taiko-hoodi',
  symbol: 'TAIKOH',
  coinId: 'taiko-hoodi',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/taiko-hoodi/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/taiko-hoodi',
  sendCoinPathTemplate: '/v1/bridge/send/coin/taiko-hoodi/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/taiko-hoodi/main/:wallet',
  payloads: TAIKOHOODI_PAYLOADS
}

export const taikoHoodiApiInterceptor = createCoinApiInterceptor(TAIKOHOODI_API_INFO)
