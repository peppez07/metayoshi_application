import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { BITCOIN_PAYLOADS } from '../payloads'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')
const defaultBridgeUrl = `${apiBaseUrl}/v1/bridge/bitcoin/main`

export const BITCOIN_API_INFO: CoinApiInfo = {
  networkId: 'srv--bitcoin',
  symbol: 'BTC',
  coinId: 'bitcoin',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl,
  defaultExplorerUrl: '',
  healthUrl: `${apiBaseUrl}/health`,
  bridgeMethodsUrl: `${apiBaseUrl}/v1/bridge/methods/bitcoin`,
  sendCoinPathTemplate: '/v1/bridge/send/coin/bitcoin/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/bitcoin/main/:wallet',
  payloads: BITCOIN_PAYLOADS
}

export const bitcoinApiInterceptor = createCoinApiInterceptor(BITCOIN_API_INFO)
