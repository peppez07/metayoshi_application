import type { CoinApiInfo, CoinApiInterceptor } from './types'
import { dashApiInterceptor, DASH_API_INFO } from './dash'

export const SERVER_SCAFFOLD_API_INFO_BY_NETWORK_ID: Record<string, CoinApiInfo> = {
  'srv--dash': DASH_API_INFO
}

export const SERVER_SCAFFOLD_INTERCEPTOR_BY_NETWORK_ID: Record<string, CoinApiInterceptor> = {
  'srv--dash': dashApiInterceptor
}
