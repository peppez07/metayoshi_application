import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { AVALANCHEXCHAIN_PAYLOADS } from '../payloads/avalanche-x-chain'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const AVALANCHEXCHAIN_API_INFO: CoinApiInfo = {
  networkId: 'srv--avalanche-x-chain',
  symbol: 'AVALAN',
  coinId: 'avalanche-x-chain',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/avalanche-x-chain/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/avalanche-x-chain',
  sendCoinPathTemplate: '/v1/bridge/send/coin/avalanche-x-chain/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/avalanche-x-chain/main/:wallet',
  payloads: AVALANCHEXCHAIN_PAYLOADS
}

export const avalancheXChainApiInterceptor = createCoinApiInterceptor(AVALANCHEXCHAIN_API_INFO)
