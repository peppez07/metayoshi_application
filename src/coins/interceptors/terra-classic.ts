import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { TERRACLASSIC_PAYLOADS } from '../payloads/terra-classic'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const TERRACLASSIC_API_INFO: CoinApiInfo = {
  networkId: 'srv--terra-classic',
  symbol: 'TERRAC',
  coinId: 'terra-classic',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/terra-classic/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/terra-classic',
  sendCoinPathTemplate: '/v1/bridge/send/coin/terra-classic/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/terra-classic/main/:wallet',
  payloads: TERRACLASSIC_PAYLOADS
}

export const terraClassicApiInterceptor = createCoinApiInterceptor(TERRACLASSIC_API_INFO)
