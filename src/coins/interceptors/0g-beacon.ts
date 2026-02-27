import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { C0GBEACON_PAYLOADS } from '../payloads/0g-beacon'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const C0GBEACON_API_INFO: CoinApiInfo = {
  networkId: 'srv--0g-beacon',
  symbol: '0GBEAC',
  coinId: '0g-beacon',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/0g-beacon/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/0g-beacon',
  sendCoinPathTemplate: '/v1/bridge/send/coin/0g-beacon/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/0g-beacon/main/:wallet',
  payloads: C0GBEACON_PAYLOADS
}

export const c0gBeaconApiInterceptor = createCoinApiInterceptor(C0GBEACON_API_INFO)
