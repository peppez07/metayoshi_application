import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { BSCTESTNET_PAYLOADS } from '../payloads/bsc-testnet'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const BSCTESTNET_API_INFO: CoinApiInfo = {
  networkId: 'srv--bsc-testnet',
  symbol: 'BSCTES',
  coinId: 'bsc-testnet',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/bsc-testnet/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/bsc-testnet',
  sendCoinPathTemplate: '/v1/bridge/send/coin/bsc-testnet/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/bsc-testnet/main/:wallet',
  payloads: BSCTESTNET_PAYLOADS
}

export const bscTestnetApiInterceptor = createCoinApiInterceptor(BSCTESTNET_API_INFO)
