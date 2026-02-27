import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { POLKADOT_PAYLOADS } from '../payloads/polkadot'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const POLKADOT_API_INFO: CoinApiInfo = {
  networkId: 'srv--polkadot',
  symbol: 'POLKAD',
  coinId: 'polkadot',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/polkadot/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/polkadot',
  sendCoinPathTemplate: '/v1/bridge/send/coin/polkadot/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/polkadot/main/:wallet',
  payloads: POLKADOT_PAYLOADS
}

export const polkadotApiInterceptor = createCoinApiInterceptor(POLKADOT_API_INFO)
