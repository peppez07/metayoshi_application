import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'

const DEFAULT_API_BASE = 'https://xrp.metayoshi.app'
const DEFAULT_WALLET = 'mainwallet'

const apiBaseUrl = String(import.meta.env.VITE_XRP_RPC || DEFAULT_API_BASE).trim().replace(/\/+$/, '')
const wallet = String(import.meta.env.VITE_XRP_RPC_WALLET || DEFAULT_WALLET).trim() || DEFAULT_WALLET
const defaultBridgeUrl = String(
  import.meta.env.VITE_XRP_BRIDGE_URL
  || `${apiBaseUrl}/v1/bridge/xrp/main/wallet/${encodeURIComponent(wallet)}`
).trim()

export const XRP_API_INFO: CoinApiInfo = {
  networkId: 'xrp',
  symbol: 'XRP',
  coinId: 'xrp',
  chain: 'main',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl,
  defaultWallet: wallet,
  defaultExplorerUrl: 'https://xrpscan.com',
  healthUrl: `${apiBaseUrl}/health`,
  bridgeMethodsUrl: `${apiBaseUrl}/v1/bridge/methods/xrp`,
  sendCoinPathTemplate: '/v1/bridge/send/coin/xrp/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/xrp/main/:wallet'
}

export const xrpApiInterceptor = createCoinApiInterceptor(XRP_API_INFO)
