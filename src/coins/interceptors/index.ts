import { BTCZ_API_INFO, btczApiInterceptor } from './btcz'
import { DOGE_API_INFO, dogeApiInterceptor } from './doge'
import { FIRO_API_INFO, firoApiInterceptor } from './firo'
import { RTM_API_INFO, rtmApiInterceptor } from './rtm'
import { TIDE_API_INFO, tideApiInterceptor } from './tide'
import type { CoinApiInfo, CoinApiInterceptor } from './types'

const INTERCEPTOR_BY_NETWORK_ID: Record<string, CoinApiInterceptor> = {
  rtm: rtmApiInterceptor,
  doge: dogeApiInterceptor,
  tide: tideApiInterceptor,
  btcz: btczApiInterceptor,
  firo: firoApiInterceptor
}

const API_INFO_BY_NETWORK_ID: Record<string, CoinApiInfo> = {
  rtm: RTM_API_INFO,
  doge: DOGE_API_INFO,
  tide: TIDE_API_INFO,
  btcz: BTCZ_API_INFO,
  firo: FIRO_API_INFO
}

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
  FIRO_API_INFO
}

export type { CoinApiInfo, CoinApiInterceptor } from './types'
