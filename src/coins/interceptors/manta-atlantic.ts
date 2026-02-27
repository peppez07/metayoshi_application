import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { MANTAATLANTIC_PAYLOADS } from '../payloads/manta-atlantic'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const MANTAATLANTIC_API_INFO: CoinApiInfo = {
  networkId: 'srv--manta-atlantic',
  symbol: 'MANTAA',
  coinId: 'manta-atlantic',
  chain: 'main',
  protocol: 'evm-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/manta-atlantic/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/manta-atlantic',
  sendCoinPathTemplate: '/v1/bridge/send/coin/manta-atlantic/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/manta-atlantic/main/:wallet',
  payloads: MANTAATLANTIC_PAYLOADS
}

export const mantaAtlanticApiInterceptor = createCoinApiInterceptor(MANTAATLANTIC_API_INFO)
