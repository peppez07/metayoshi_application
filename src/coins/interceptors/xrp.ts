import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { XRP_PAYLOADS } from '../payloads'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const DEFAULT_WALLET = 'mainwallet'

const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')
const wallet = String(import.meta.env.VITE_XRP_RPC_WALLET || DEFAULT_WALLET).trim() || DEFAULT_WALLET
const defaultBridgeUrl = `${apiBaseUrl}/v1/bridge/xrp/main/wallet/${encodeURIComponent(wallet)}`

export const XRP_API_INFO: CoinApiInfo = {
  networkId: 'xrp',
  symbol: 'XRP',
  coinId: 'xrp',
  chain: 'main',
  protocol: 'xrp-jsonrpc-compat',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl,
  defaultWallet: wallet,
  defaultExplorerUrl: 'https://xrpscan.com',
  healthUrl: `${apiBaseUrl}/health`,
  bridgeMethodsUrl: `${apiBaseUrl}/v1/bridge/methods/xrp`,
  sendCoinPathTemplate: '/v1/bridge/send/coin/xrp/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/xrp/main/:wallet',
  payloads: XRP_PAYLOADS
}

export const xrpApiInterceptor = createCoinApiInterceptor(XRP_API_INFO)
