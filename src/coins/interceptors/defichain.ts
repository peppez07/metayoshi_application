import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { DEFICHAIN_PAYLOADS } from '../payloads/defichain'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const DEFICHAIN_API_INFO: CoinApiInfo = {
  networkId: 'srv--defichain',
  symbol: 'DEFICH',
  coinId: 'defichain',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/defichain/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/defichain',
  sendCoinPathTemplate: '/v1/bridge/send/coin/defichain/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/defichain/main/:wallet',
  payloads: DEFICHAIN_PAYLOADS
}

export const defichainApiInterceptor = createCoinApiInterceptor(DEFICHAIN_API_INFO)
