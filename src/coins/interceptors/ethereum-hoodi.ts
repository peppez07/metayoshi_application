import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { ETHEREUMHOODI_PAYLOADS } from '../payloads/ethereum-hoodi'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const ETHEREUMHOODI_API_INFO: CoinApiInfo = {
  networkId: 'srv--ethereum-hoodi',
  symbol: 'ETHERE',
  coinId: 'ethereum-hoodi',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/ethereum-hoodi/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/ethereum-hoodi',
  sendCoinPathTemplate: '/v1/bridge/send/coin/ethereum-hoodi/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/ethereum-hoodi/main/:wallet',
  payloads: ETHEREUMHOODI_PAYLOADS
}

export const ethereumHoodiApiInterceptor = createCoinApiInterceptor(ETHEREUMHOODI_API_INFO)
