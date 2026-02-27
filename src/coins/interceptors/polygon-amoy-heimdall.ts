import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { POLYGONAMOYHEIMDALL_PAYLOADS } from '../payloads/polygon-amoy-heimdall'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const POLYGONAMOYHEIMDALL_API_INFO: CoinApiInfo = {
  networkId: 'srv--polygon-amoy-heimdall',
  symbol: 'POLYGO',
  coinId: 'polygon-amoy-heimdall',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/polygon-amoy-heimdall/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/polygon-amoy-heimdall',
  sendCoinPathTemplate: '/v1/bridge/send/coin/polygon-amoy-heimdall/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/polygon-amoy-heimdall/main/:wallet',
  payloads: POLYGONAMOYHEIMDALL_PAYLOADS
}

export const polygonAmoyHeimdallApiInterceptor = createCoinApiInterceptor(POLYGONAMOYHEIMDALL_API_INFO)
