import { createCoinApiInterceptor } from './factory'
import type { CoinApiInfo } from './types'
import { FRAXTALHOODI_PAYLOADS } from '../payloads/fraxtal-hoodi'

const DEFAULT_API_BASE = 'https://api.metayoshi.app'
const apiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || DEFAULT_API_BASE).trim().replace(/\/+$/, '')

export const FRAXTALHOODI_API_INFO: CoinApiInfo = {
  networkId: 'srv--fraxtal-hoodi',
  symbol: 'FRAXTA',
  coinId: 'fraxtal-hoodi',
  chain: 'main',
  protocol: 'utxo-jsonrpc',
  apiBaseUrl,
  defaultRpcUrl: apiBaseUrl,
  defaultBridgeUrl: apiBaseUrl + '/v1/bridge/fraxtal-hoodi/main',
  defaultWallet: '',
  defaultExplorerUrl: '',
  healthUrl: apiBaseUrl + '/health',
  bridgeMethodsUrl: apiBaseUrl + '/v1/bridge/methods/fraxtal-hoodi',
  sendCoinPathTemplate: '/v1/bridge/send/coin/fraxtal-hoodi/main/:wallet',
  sendAssetPathTemplate: '/v1/bridge/send/asset/fraxtal-hoodi/main/:wallet',
  payloads: FRAXTALHOODI_PAYLOADS
}

export const fraxtalHoodiApiInterceptor = createCoinApiInterceptor(FRAXTALHOODI_API_INFO)
