import { BTCZ_API_INFO, btczApiInterceptor } from './btcz'
import { DOGE_API_INFO, dogeApiInterceptor } from './doge'
import { FIRO_API_INFO, firoApiInterceptor } from './firo'
import { RTM_API_INFO, rtmApiInterceptor } from './rtm'
import { TIDE_API_INFO, tideApiInterceptor } from './tide'
import { XRP_API_INFO, xrpApiInterceptor } from './xrp'
import type { CoinApiInfo, CoinApiInterceptor } from './types'

export const COIN_API_ORDER = ['rtm', 'doge', 'btcz', 'tide', 'firo', 'xrp'] as const

const COIN_API_REGISTRY: ReadonlyArray<{
  networkId: (typeof COIN_API_ORDER)[number]
  interceptor: CoinApiInterceptor
  info: CoinApiInfo
}> = [
  { networkId: 'rtm', interceptor: rtmApiInterceptor, info: RTM_API_INFO },
  { networkId: 'doge', interceptor: dogeApiInterceptor, info: DOGE_API_INFO },
  { networkId: 'btcz', interceptor: btczApiInterceptor, info: BTCZ_API_INFO },
  { networkId: 'tide', interceptor: tideApiInterceptor, info: TIDE_API_INFO },
  { networkId: 'firo', interceptor: firoApiInterceptor, info: FIRO_API_INFO },
  { networkId: 'xrp', interceptor: xrpApiInterceptor, info: XRP_API_INFO }
]

const INTERCEPTOR_BY_NETWORK_ID: Record<string, CoinApiInterceptor> = Object.fromEntries(
  COIN_API_REGISTRY.map((entry) => [entry.networkId, entry.interceptor])
)

const API_INFO_BY_NETWORK_ID: Record<string, CoinApiInfo> = Object.fromEntries(
  COIN_API_REGISTRY.map((entry) => [entry.networkId, entry.info])
)

export function getCoinApiInterceptor(networkId?: string): CoinApiInterceptor | undefined {
  if (!networkId) return undefined
  return INTERCEPTOR_BY_NETWORK_ID[networkId]
}

export function getCoinApiInfo(networkId?: string): CoinApiInfo | undefined {
  if (!networkId) return undefined
  return API_INFO_BY_NETWORK_ID[networkId]
}

export {
  RTM_API_INFO,
  DOGE_API_INFO,
  TIDE_API_INFO,
  BTCZ_API_INFO,
  FIRO_API_INFO,
  XRP_API_INFO
}

export type { CoinApiInfo, CoinApiInterceptor } from './types'
