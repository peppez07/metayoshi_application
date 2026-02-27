import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { AKASH_PAYLOADS } from '../payloads/akash'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const AKASH_API_INFO: CoinApiInfo = {
  networkId: 'srv--akash',
  symbol: 'AKASH',
  coinId: 'akash',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/akash/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/akash',
  sendCoinPathTemplate: '/v1/bridge/send/coin/akash/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/akash/main/:wallet',
  payloads: AKASH_PAYLOADS
}

export const akashApiInterceptor = createCoinApiInterceptor(AKASH_API_INFO)
