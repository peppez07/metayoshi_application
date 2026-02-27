import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { SONEIUMMINATO_PAYLOADS } from '../payloads/soneium-minato'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const SONEIUMMINATO_API_INFO: CoinApiInfo = {
  networkId: 'srv--soneium-minato',
  symbol: 'SONEIU',
  coinId: 'soneium-minato',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/soneium-minato/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/soneium-minato',
  sendCoinPathTemplate: '/v1/bridge/send/coin/soneium-minato/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/soneium-minato/main/:wallet',
  payloads: SONEIUMMINATO_PAYLOADS
}

export const soneiumMinatoApiInterceptor = createCoinApiInterceptor(SONEIUMMINATO_API_INFO)
