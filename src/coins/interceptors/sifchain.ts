import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { SIFCHAIN_PAYLOADS } from '../payloads/sifchain'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const SIFCHAIN_API_INFO: CoinApiInfo = {
  networkId: 'srv--sifchain',
  symbol: 'SIFCHA',
  coinId: 'sifchain',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/sifchain/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/sifchain',
  sendCoinPathTemplate: '/v1/bridge/send/coin/sifchain/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/sifchain/main/:wallet',
  payloads: SIFCHAIN_PAYLOADS
}

export const sifchainApiInterceptor = createCoinApiInterceptor(SIFCHAIN_API_INFO)
