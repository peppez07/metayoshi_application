import type { CoinApiInfo, CoinApiInterceptor } from './types'
import { cosmosApiInterceptor, COSMOS_API_INFO } from './cosmos'

export const SERVER_SCAFFOLD_API_INFO_BY_NETWORK_ID: Record<string, CoinApiInfo> = {
  'srv--cosmos': COSMOS_API_INFO
}

export const SERVER_SCAFFOLD_INTERCEPTOR_BY_NETWORK_ID: Record<string, CoinApiInterceptor> = {
  'srv--cosmos': cosmosApiInterceptor
}
