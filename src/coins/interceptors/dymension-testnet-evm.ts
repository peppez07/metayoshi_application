import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { DYMENSIONTESTNETEVM_PAYLOADS } from '../payloads/dymension-testnet-evm'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const DYMENSIONTESTNETEVM_API_INFO: CoinApiInfo = {
  networkId: 'srv--dymension-testnet-evm',
  symbol: 'DYMENS',
  coinId: 'dymension-testnet-evm',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/dymension-testnet-evm/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/dymension-testnet-evm',
  sendCoinPathTemplate: '/v1/bridge/send/coin/dymension-testnet-evm/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/dymension-testnet-evm/main/:wallet',
  payloads: DYMENSIONTESTNETEVM_PAYLOADS
}

export const dymensionTestnetEvmApiInterceptor = createCoinApiInterceptor(DYMENSIONTESTNETEVM_API_INFO)
