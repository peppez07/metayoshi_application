import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { COSMOS_PAYLOADS } from '../payloads/cosmos'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const COSMOS_API_INFO: CoinApiInfo = {
  networkId: 'srv--cosmos',
  symbol: 'ATOM',
  coinId: 'cosmos',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/cosmos/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/cosmos',
  sendCoinPathTemplate: '/v1/bridge/send/coin/cosmos/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/cosmos/main/:wallet',
  payloads: COSMOS_PAYLOADS
}

export const cosmosApiInterceptor = createCoinApiInterceptor(COSMOS_API_INFO)
