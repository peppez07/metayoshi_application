import type { CoinPayloadCatalog } from './types'
import { COSMOS_PAYLOADS } from './cosmos'

export const SERVER_SCAFFOLD_PAYLOADS_BY_NETWORK_ID: Record<string, CoinPayloadCatalog> = {
  'srv--cosmos': COSMOS_PAYLOADS
}
