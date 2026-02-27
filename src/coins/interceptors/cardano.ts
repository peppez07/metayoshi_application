import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { ADA_PAYLOADS } from '../payloads'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'

const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')
const defaultBridgeUrl = `${apiBaseUrl}/v1/bridge/cardano/main`

export const ADA_API_INFO: CoinApiInfo = {
  networkId: 'ada',
  symbol: 'ADA',
  coinId: 'cardano',
  chain: 'main',
  protocol: 'cardano-wallet-compat',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl,
  defaultWallet: '',
  defaultExplorerUrl: 'https://cardanoscan.io',
  healthUrl: `${apiBaseUrl}/health`,
  bridgeMethodsUrl: `${apiBaseUrl}/v1/bridge/methods/cardano`,
  sendCoinPathTemplate: '/v1/bridge/send/coin/cardano/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/cardano/main/:wallet',
  payloads: ADA_PAYLOADS
}

export const adaApiInterceptor = createCoinApiInterceptor(ADA_API_INFO)
