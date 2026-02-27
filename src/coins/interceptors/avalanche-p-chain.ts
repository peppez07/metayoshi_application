import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { AVALANCHEPCHAIN_PAYLOADS } from '../payloads/avalanche-p-chain'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const AVALANCHEPCHAIN_API_INFO: CoinApiInfo = {
  networkId: 'srv--avalanche-p-chain',
  symbol: 'AVALAN',
  coinId: 'avalanche-p-chain',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/avalanche-p-chain/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/avalanche-p-chain',
  sendCoinPathTemplate: '/v1/bridge/send/coin/avalanche-p-chain/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/avalanche-p-chain/main/:wallet',
  payloads: AVALANCHEPCHAIN_PAYLOADS
}

export const avalanchePChainApiInterceptor = createCoinApiInterceptor(AVALANCHEPCHAIN_API_INFO)
