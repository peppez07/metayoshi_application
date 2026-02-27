import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { DORA_PAYLOADS } from '../payloads/dora'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const DORA_API_INFO: CoinApiInfo = {
  networkId: 'srv--dora',
  symbol: 'DORA',
  coinId: 'dora',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/dora/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/dora',
  sendCoinPathTemplate: '/v1/bridge/send/coin/dora/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/dora/main/:wallet',
  payloads: DORA_PAYLOADS
}

export const doraApiInterceptor = createCoinApiInterceptor(DORA_API_INFO)
