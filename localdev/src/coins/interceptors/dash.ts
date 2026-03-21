import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { resolvePublicApiBaseUrl } from '../../lib/apiBase'

const apiBaseUrl = resolvePublicApiBaseUrl((import.meta as any)?.env?.VITE_API_BASE_URL)
const defaultBridgeUrl = `${apiBaseUrl}/v1/bridge/dash/main`

export const DASH_API_INFO: CoinApiInfo = {
  networkId: 'dash',
  symbol: 'DASH',
  coinId: 'dash',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl,
  defaultExplorerUrl: '',
  healthUrl: `${apiBaseUrl}/health`,
  bridgeMethodsUrl: `${apiBaseUrl}/v1/bridge/methods/dash`,
  sendCoinPathTemplate: '/v1/bridge/send/coin/dash/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/dash/main/:wallet'
}

export const dashApiInterceptor = createCoinApiInterceptor(DASH_API_INFO)
