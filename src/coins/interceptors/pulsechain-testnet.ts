import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { PULSECHAINTESTNET_PAYLOADS } from '../payloads/pulsechain-testnet'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const PULSECHAINTESTNET_API_INFO: CoinApiInfo = {
  networkId: 'srv--pulsechain-testnet',
  symbol: 'PULSEC',
  coinId: 'pulsechain-testnet',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/pulsechain-testnet/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/pulsechain-testnet',
  sendCoinPathTemplate: '/v1/bridge/send/coin/pulsechain-testnet/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/pulsechain-testnet/main/:wallet',
  payloads: PULSECHAINTESTNET_PAYLOADS
}

export const pulsechainTestnetApiInterceptor = createCoinApiInterceptor(PULSECHAINTESTNET_API_INFO)
