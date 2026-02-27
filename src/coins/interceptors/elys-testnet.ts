import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { ELYSTESTNET_PAYLOADS } from '../payloads/elys-testnet'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const ELYSTESTNET_API_INFO: CoinApiInfo = {
  networkId: 'srv--elys-testnet',
  symbol: 'ELYSTE',
  coinId: 'elys-testnet',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/elys-testnet/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/elys-testnet',
  sendCoinPathTemplate: '/v1/bridge/send/coin/elys-testnet/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/elys-testnet/main/:wallet',
  payloads: ELYSTESTNET_PAYLOADS
}

export const elysTestnetApiInterceptor = createCoinApiInterceptor(ELYSTESTNET_API_INFO)
