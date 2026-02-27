import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { PASSAGE_PAYLOADS } from '../payloads/passage'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const PASSAGE_API_INFO: CoinApiInfo = {
  networkId: 'srv--passage',
  symbol: 'PASSAG',
  coinId: 'passage',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/passage/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/passage',
  sendCoinPathTemplate: '/v1/bridge/send/coin/passage/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/passage/main/:wallet',
  payloads: PASSAGE_PAYLOADS
}

export const passageApiInterceptor = createCoinApiInterceptor(PASSAGE_API_INFO)
