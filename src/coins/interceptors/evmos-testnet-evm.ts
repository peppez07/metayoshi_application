import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { EVMOSTESTNETEVM_PAYLOADS } from '../payloads/evmos-testnet-evm'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const EVMOSTESTNETEVM_API_INFO: CoinApiInfo = {
  networkId: 'srv--evmos-testnet-evm',
  symbol: 'EVMOST',
  coinId: 'evmos-testnet-evm',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/evmos-testnet-evm/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/evmos-testnet-evm',
  sendCoinPathTemplate: '/v1/bridge/send/coin/evmos-testnet-evm/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/evmos-testnet-evm/main/:wallet',
  payloads: EVMOSTESTNETEVM_PAYLOADS
}

export const evmosTestnetEvmApiInterceptor = createCoinApiInterceptor(EVMOSTESTNETEVM_API_INFO)
