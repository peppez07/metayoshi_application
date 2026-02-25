import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'

const DEFAULT_API_BASE = 'https://ada.metayoshi.app'

const apiBaseUrl = String(import.meta.env.VITE_ADA_RPC || DEFAULT_API_BASE).trim().replace(/\/+$/, '')
const defaultBridgeUrl = String(import.meta.env.VITE_ADA_BRIDGE_URL || `${apiBaseUrl}/v1/bridge`).trim()

export const ADA_API_INFO: CoinApiInfo = {
  networkId: 'ada',
  symbol: 'ADA',
  coinId: 'cardano',
  chain: 'main',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl,
  defaultWallet: '',
  defaultExplorerUrl: 'https://cardanoscan.io',
  healthUrl: `${apiBaseUrl}/health`,
  bridgeMethodsUrl: `${apiBaseUrl}/v1/bridge/methods/cardano`,
  sendCoinPathTemplate: '/v1/bridge/send/coin/cardano/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/cardano/main/:wallet'
}

export const adaApiInterceptor = createCoinApiInterceptor(ADA_API_INFO)

