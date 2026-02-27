import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { BABYLON_PAYLOADS } from '../payloads/babylon'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const BABYLON_API_INFO: CoinApiInfo = {
  networkId: 'srv--babylon',
  symbol: 'BABYLO',
  coinId: 'babylon',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/babylon/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/babylon',
  sendCoinPathTemplate: '/v1/bridge/send/coin/babylon/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/babylon/main/:wallet',
  payloads: BABYLON_PAYLOADS
}

export const babylonApiInterceptor = createCoinApiInterceptor(BABYLON_API_INFO)
