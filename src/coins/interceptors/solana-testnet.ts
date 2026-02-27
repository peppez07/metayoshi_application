import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { SOLANATESTNET_PAYLOADS } from '../payloads/solana-testnet'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const SOLANATESTNET_API_INFO: CoinApiInfo = {
  networkId: 'srv--solana-testnet',
  symbol: 'SOLANA',
  coinId: 'solana-testnet',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/solana-testnet/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/solana-testnet',
  sendCoinPathTemplate: '/v1/bridge/send/coin/solana-testnet/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/solana-testnet/main/:wallet',
  payloads: SOLANATESTNET_PAYLOADS
}

export const solanaTestnetApiInterceptor = createCoinApiInterceptor(SOLANATESTNET_API_INFO)
