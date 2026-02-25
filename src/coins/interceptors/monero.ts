import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { XMR_PAYLOADS } from '../payloads'

const DEFAULT_API_BASE = 'https://xmr.metayoshi.app'

const apiBaseUrl = String(import.meta.env.VITE_XMR_RPC || DEFAULT_API_BASE).trim().replace(/\/+$/, '')
const defaultBridgeUrl = String(import.meta.env.VITE_XMR_BRIDGE_URL || `${apiBaseUrl}/v1/bridge`).trim()

export const XMR_API_INFO: CoinApiInfo = {
  networkId: 'xmr',
  symbol: 'XMR',
  coinId: 'monero',
  chain: 'main',
  protocol: 'monero-wallet-compat',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl,
  defaultWallet: '',
  defaultExplorerUrl: 'https://xmrchain.net',
  healthUrl: `${apiBaseUrl}/health`,
  bridgeMethodsUrl: `${apiBaseUrl}/v1/bridge/methods/monero`,
  sendCoinPathTemplate: '/v1/bridge/send/coin/monero/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/monero/main/:wallet',
  payloads: XMR_PAYLOADS
}

export const xmrApiInterceptor = createCoinApiInterceptor(XMR_API_INFO)
