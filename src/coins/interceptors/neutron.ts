import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { NEUTRON_PAYLOADS } from '../payloads/neutron'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const NEUTRON_API_INFO: CoinApiInfo = {
  networkId: 'srv--neutron',
  symbol: 'NEUTRO',
  coinId: 'neutron',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/neutron/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/neutron',
  sendCoinPathTemplate: '/v1/bridge/send/coin/neutron/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/neutron/main/:wallet',
  payloads: NEUTRON_PAYLOADS
}

export const neutronApiInterceptor = createCoinApiInterceptor(NEUTRON_API_INFO)
