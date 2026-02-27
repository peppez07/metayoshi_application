import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { EVMOSTESTNET_PAYLOADS } from '../payloads/evmos-testnet'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const EVMOSTESTNET_API_INFO: CoinApiInfo = {
  networkId: 'srv--evmos-testnet',
  symbol: 'EVMOST',
  coinId: 'evmos-testnet',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/evmos-testnet/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/evmos-testnet',
  sendCoinPathTemplate: '/v1/bridge/send/coin/evmos-testnet/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/evmos-testnet/main/:wallet',
  payloads: EVMOSTESTNET_PAYLOADS
}

export const evmosTestnetApiInterceptor = createCoinApiInterceptor(EVMOSTESTNET_API_INFO)
