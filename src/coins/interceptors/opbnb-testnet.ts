import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { OPBNBTESTNET_PAYLOADS } from '../payloads/opbnb-testnet'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const OPBNBTESTNET_API_INFO: CoinApiInfo = {
  networkId: 'srv--opbnb-testnet',
  symbol: 'OPBNBT',
  coinId: 'opbnb-testnet',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/opbnb-testnet/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/opbnb-testnet',
  sendCoinPathTemplate: '/v1/bridge/send/coin/opbnb-testnet/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/opbnb-testnet/main/:wallet',
  payloads: OPBNBTESTNET_PAYLOADS
}

export const opbnbTestnetApiInterceptor = createCoinApiInterceptor(OPBNBTESTNET_API_INFO)
