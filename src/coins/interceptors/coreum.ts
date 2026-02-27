import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { COREUM_PAYLOADS } from '../payloads/coreum'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const COREUM_API_INFO: CoinApiInfo = {
  networkId: 'srv--coreum',
  symbol: 'COREUM',
  coinId: 'coreum',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/coreum/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/coreum',
  sendCoinPathTemplate: '/v1/bridge/send/coin/coreum/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/coreum/main/:wallet',
  payloads: COREUM_PAYLOADS
}

export const coreumApiInterceptor = createCoinApiInterceptor(COREUM_API_INFO)
