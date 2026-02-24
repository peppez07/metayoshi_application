import { BTCZ_PAYLOADS } from './btcz'
import { DOGE_PAYLOADS } from './doge'
import { FIRO_PAYLOADS } from './firo'
import { RTM_PAYLOADS } from './rtm'
import { TIDE_PAYLOADS } from './tide'
import type { CoinPayloadCatalog } from './types'

export const PAYLOAD_CATALOG_ORDER = ['rtm', 'doge', 'btcz', 'tide', 'firo'] as const

const PAYLOAD_CATALOG_REGISTRY: ReadonlyArray<{
  networkId: (typeof PAYLOAD_CATALOG_ORDER)[number]
  catalog: CoinPayloadCatalog
}> = [
  { networkId: 'rtm', catalog: RTM_PAYLOADS },
  { networkId: 'doge', catalog: DOGE_PAYLOADS },
  { networkId: 'btcz', catalog: BTCZ_PAYLOADS },
  { networkId: 'tide', catalog: TIDE_PAYLOADS },
  { networkId: 'firo', catalog: FIRO_PAYLOADS }
]

export const PAYLOADS_BY_NETWORK_ID = Object.fromEntries(
  PAYLOAD_CATALOG_REGISTRY.map((entry) => [entry.networkId, entry.catalog])
) as Record<(typeof PAYLOAD_CATALOG_ORDER)[number], CoinPayloadCatalog>

export function getCoinPayloadCatalog(networkId?: string) {
  if (!networkId) return undefined
  return PAYLOADS_BY_NETWORK_ID[networkId as keyof typeof PAYLOADS_BY_NETWORK_ID]
}

export {
  RTM_PAYLOADS,
  DOGE_PAYLOADS,
  TIDE_PAYLOADS,
  BTCZ_PAYLOADS,
  FIRO_PAYLOADS
}

export type { CoinPayloadCatalog, CoinPayloadBuilders, JsonRpcEnvelope, UtxoTxInputRef } from './types'
