import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { resolvePublicApiBaseUrl } from '../../lib/apiBase'

const apiBaseUrl = resolvePublicApiBaseUrl((import.meta as any)?.env?.VITE_API_BASE_URL)
const defaultBridgeUrl = `${apiBaseUrl}/v1/bridge/firo/main`

export const FIRO_API_INFO: CoinApiInfo = {
  networkId: 'firo',
  symbol: 'FIRO',
  coinId: 'firo',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl,
  defaultExplorerUrl: '',
  healthUrl: `${apiBaseUrl}/health`,
  bridgeMethodsUrl: `${apiBaseUrl}/v1/bridge/methods/firo`,
  sendCoinPathTemplate: '/v1/bridge/send/coin/firo/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/firo/main/:wallet'
}

export const firoApiInterceptor = createCoinApiInterceptor(FIRO_API_INFO)
