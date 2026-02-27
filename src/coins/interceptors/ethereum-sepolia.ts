import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { ETHEREUMSEPOLIA_PAYLOADS } from '../payloads/ethereum-sepolia'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const ETHEREUMSEPOLIA_API_INFO: CoinApiInfo = {
  networkId: 'srv--ethereum-sepolia',
  symbol: 'ETHERE',
  coinId: 'ethereum-sepolia',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/ethereum-sepolia/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/ethereum-sepolia',
  sendCoinPathTemplate: '/v1/bridge/send/coin/ethereum-sepolia/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/ethereum-sepolia/main/:wallet',
  payloads: ETHEREUMSEPOLIA_PAYLOADS
}

export const ethereumSepoliaApiInterceptor = createCoinApiInterceptor(ETHEREUMSEPOLIA_API_INFO)
