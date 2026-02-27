import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { JUNO_PAYLOADS } from '../payloads/juno'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const JUNO_API_INFO: CoinApiInfo = {
  networkId: 'srv--juno',
  symbol: 'JUNO',
  coinId: 'juno',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/juno/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/juno',
  sendCoinPathTemplate: '/v1/bridge/send/coin/juno/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/juno/main/:wallet',
  payloads: JUNO_PAYLOADS
}

export const junoApiInterceptor = createCoinApiInterceptor(JUNO_API_INFO)
