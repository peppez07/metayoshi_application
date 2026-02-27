import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { SYSCOINTANENBAUMEVM_PAYLOADS } from '../payloads/syscoin-tanenbaum-evm'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const SYSCOINTANENBAUMEVM_API_INFO: CoinApiInfo = {
  networkId: 'srv--syscoin-tanenbaum-evm',
  symbol: 'SYS',
  coinId: 'syscoin-tanenbaum-evm',
  chain: 'main',
  protocol: 'evm-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/syscoin-tanenbaum-evm/main',
  defaultWallet: '',
  defaultExplorerUrl: 'https://explorer.syscoin.org',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/syscoin-tanenbaum-evm',
  sendCoinPathTemplate: '/v1/bridge/send/coin/syscoin-tanenbaum-evm/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/syscoin-tanenbaum-evm/main/:wallet',
  payloads: SYSCOINTANENBAUMEVM_PAYLOADS
}

export const syscoinTanenbaumEvmApiInterceptor = createCoinApiInterceptor(SYSCOINTANENBAUMEVM_API_INFO)
