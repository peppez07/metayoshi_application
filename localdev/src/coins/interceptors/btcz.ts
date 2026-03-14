import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { resolvePublicApiBaseUrl } from '../../lib/apiBase'

// BTCZ mainnet API profile and transport interceptor.
const apiBaseUrl = resolvePublicApiBaseUrl((import.meta as any)?.env?.VITE_API_BASE_URL)
const defaultBridgeUrl = `${apiBaseUrl}/v1/bridge/bitcoinz/main`

export const BTCZ_API_INFO: CoinApiInfo = {
  networkId: 'btcz',
  symbol: 'BTCZ',
  coinId: 'bitcoinz',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl,
  defaultExplorerUrl: 'https://explorer.btcz.rocks',
  healthUrl: `${apiBaseUrl}/health`,
  bridgeMethodsUrl: `${apiBaseUrl}/v1/bridge/methods/bitcoinz`,
  sendCoinPathTemplate: '/v1/bridge/send/coin/bitcoinz/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/bitcoinz/main/:wallet'
}

export const btczApiInterceptor = createCoinApiInterceptor(BTCZ_API_INFO)
