import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { BITCOINTESTNET_PAYLOADS } from '../payloads/bitcoin-testnet'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const BITCOINTESTNET_API_INFO: CoinApiInfo = {
  networkId: 'srv--bitcoin-testnet',
  symbol: 'BTC',
  coinId: 'bitcoin-testnet',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/bitcoin-testnet/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/bitcoin-testnet',
  sendCoinPathTemplate: '/v1/bridge/send/coin/bitcoin-testnet/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/bitcoin-testnet/main/:wallet',
  payloads: BITCOINTESTNET_PAYLOADS
}

export const bitcoinTestnetApiInterceptor = createCoinApiInterceptor(BITCOINTESTNET_API_INFO)
