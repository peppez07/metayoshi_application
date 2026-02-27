import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { MANTAATLANTIC_PAYLOADS } from '../payloads'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')
const defaultBridgeUrl = `${apiBaseUrl}/v1/bridge/manta-atlantic/main`

export const MANTAATLANTIC_API_INFO: CoinApiInfo = {
  networkId: 'srv--manta-atlantic',
  symbol: 'MANTA',
  coinId: 'manta-atlantic',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl,
  defaultExplorerUrl: '',
  healthUrl: `${apiBaseUrl}/health`,
  bridgeMethodsUrl: `${apiBaseUrl}/v1/bridge/methods/manta-atlantic`,
  sendCoinPathTemplate: '/v1/bridge/send/coin/manta-atlantic/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/manta-atlantic/main/:wallet',
  payloads: MANTAATLANTIC_PAYLOADS
}

export const mantaAtlanticApiInterceptor = createCoinApiInterceptor(MANTAATLANTIC_API_INFO)
