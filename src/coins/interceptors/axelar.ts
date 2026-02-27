import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { AXELAR_PAYLOADS } from '../payloads/axelar'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const AXELAR_API_INFO: CoinApiInfo = {
  networkId: 'srv--axelar',
  symbol: 'AXELAR',
  coinId: 'axelar',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/axelar/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/axelar',
  sendCoinPathTemplate: '/v1/bridge/send/coin/axelar/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/axelar/main/:wallet',
  payloads: AXELAR_PAYLOADS
}

export const axelarApiInterceptor = createCoinApiInterceptor(AXELAR_API_INFO)
