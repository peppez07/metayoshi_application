import { ARR_PAYLOADS } from './arr'
import { ADA_PAYLOADS } from './cardano'
import { BTCZ_PAYLOADS } from './btcz'
import { DOGE_PAYLOADS } from './doge'
import { FIRO_PAYLOADS } from './firo'
import { XMR_PAYLOADS } from './monero'
import { RTM_PAYLOADS } from './rtm'
import { TIDE_PAYLOADS } from './tide'
import { XRP_PAYLOADS } from './xrp'
import type { CoinPayloadCatalog } from './types'

export const PAYLOAD_CATALOG_ORDER = ['rtm', 'doge', 'btcz', 'tide', 'firo', 'xrp', 'arr', 'xmr', 'ada'] as const

const PAYLOAD_CATALOG_REGISTRY: ReadonlyArray<{
  networkId: (typeof PAYLOAD_CATALOG_ORDER)[number]
  catalog: CoinPayloadCatalog
}> = [
  { networkId: 'rtm', catalog: RTM_PAYLOADS },
  { networkId: 'doge', catalog: DOGE_PAYLOADS },
  { networkId: 'btcz', catalog: BTCZ_PAYLOADS },
  { networkId: 'tide', catalog: TIDE_PAYLOADS },
  { networkId: 'firo', catalog: FIRO_PAYLOADS },
  { networkId: 'xrp', catalog: XRP_PAYLOADS },
  { networkId: 'arr', catalog: ARR_PAYLOADS },
  { networkId: 'xmr', catalog: XMR_PAYLOADS },
  { networkId: 'ada', catalog: ADA_PAYLOADS }
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
  FIRO_PAYLOADS,
  ARR_PAYLOADS,
  XRP_PAYLOADS,
  XMR_PAYLOADS,
  ADA_PAYLOADS
}

export type { CoinPayloadCatalog, CoinPayloadBuilders, JsonRpcEnvelope, UtxoTxInputRef } from './types'
