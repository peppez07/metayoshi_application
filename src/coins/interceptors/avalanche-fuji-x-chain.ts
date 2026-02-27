import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { AVALANCHEFUJIXCHAIN_PAYLOADS } from '../payloads/avalanche-fuji-x-chain'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const AVALANCHEFUJIXCHAIN_API_INFO: CoinApiInfo = {
  networkId: 'srv--avalanche-fuji-x-chain',
  symbol: 'AVALAN',
  coinId: 'avalanche-fuji-x-chain',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/avalanche-fuji-x-chain/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/avalanche-fuji-x-chain',
  sendCoinPathTemplate: '/v1/bridge/send/coin/avalanche-fuji-x-chain/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/avalanche-fuji-x-chain/main/:wallet',
  payloads: AVALANCHEFUJIXCHAIN_PAYLOADS
}

export const avalancheFujiXChainApiInterceptor = createCoinApiInterceptor(AVALANCHEFUJIXCHAIN_API_INFO)
