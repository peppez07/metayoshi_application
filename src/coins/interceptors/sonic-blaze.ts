import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { SONICBLAZE_PAYLOADS } from '../payloads/sonic-blaze'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const SONICBLAZE_API_INFO: CoinApiInfo = {
  networkId: 'srv--sonic-blaze',
  symbol: 'SONICB',
  coinId: 'sonic-blaze',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/sonic-blaze/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/sonic-blaze',
  sendCoinPathTemplate: '/v1/bridge/send/coin/sonic-blaze/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/sonic-blaze/main/:wallet',
  payloads: SONICBLAZE_PAYLOADS
}

export const sonicBlazeApiInterceptor = createCoinApiInterceptor(SONICBLAZE_API_INFO)
