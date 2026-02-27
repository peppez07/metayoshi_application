import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { TERRACLASSIC_PAYLOADS } from '../payloads'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')
const defaultBridgeUrl = `${apiBaseUrl}/v1/bridge/terra-classic/main`

export const TERRACLASSIC_API_INFO: CoinApiInfo = {
  networkId: 'srv--terra-classic',
  symbol: 'LUNC',
  coinId: 'terra-classic',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl,
  defaultExplorerUrl: '',
  healthUrl: `${apiBaseUrl}/health`,
  bridgeMethodsUrl: `${apiBaseUrl}/v1/bridge/methods/terra-classic`,
  sendCoinPathTemplate: '/v1/bridge/send/coin/terra-classic/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/terra-classic/main/:wallet',
  payloads: TERRACLASSIC_PAYLOADS
}

export const terraClassicApiInterceptor = createCoinApiInterceptor(TERRACLASSIC_API_INFO)
