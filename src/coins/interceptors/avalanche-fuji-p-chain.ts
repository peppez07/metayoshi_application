import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { AVALANCHEFUJIPCHAIN_PAYLOADS } from '../payloads/avalanche-fuji-p-chain'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const AVALANCHEFUJIPCHAIN_API_INFO: CoinApiInfo = {
  networkId: 'srv--avalanche-fuji-p-chain',
  symbol: 'AVALAN',
  coinId: 'avalanche-fuji-p-chain',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/avalanche-fuji-p-chain/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/avalanche-fuji-p-chain',
  sendCoinPathTemplate: '/v1/bridge/send/coin/avalanche-fuji-p-chain/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/avalanche-fuji-p-chain/main/:wallet',
  payloads: AVALANCHEFUJIPCHAIN_PAYLOADS
}

export const avalancheFujiPChainApiInterceptor = createCoinApiInterceptor(AVALANCHEFUJIPCHAIN_API_INFO)
