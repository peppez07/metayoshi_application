import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { ATOMONE_PAYLOADS } from '../payloads/atomone'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const ATOMONE_API_INFO: CoinApiInfo = {
  networkId: 'srv--atomone',
  symbol: 'ATOMON',
  coinId: 'atomone',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/atomone/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/atomone',
  sendCoinPathTemplate: '/v1/bridge/send/coin/atomone/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/atomone/main/:wallet',
  payloads: ATOMONE_PAYLOADS
}

export const atomoneApiInterceptor = createCoinApiInterceptor(ATOMONE_API_INFO)
