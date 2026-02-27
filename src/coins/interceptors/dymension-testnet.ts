import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { DYMENSIONTESTNET_PAYLOADS } from '../payloads/dymension-testnet'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const DYMENSIONTESTNET_API_INFO: CoinApiInfo = {
  networkId: 'srv--dymension-testnet',
  symbol: 'DYMENS',
  coinId: 'dymension-testnet',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/dymension-testnet/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/dymension-testnet',
  sendCoinPathTemplate: '/v1/bridge/send/coin/dymension-testnet/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/dymension-testnet/main/:wallet',
  payloads: DYMENSIONTESTNET_PAYLOADS
}

export const dymensionTestnetApiInterceptor = createCoinApiInterceptor(DYMENSIONTESTNET_API_INFO)
