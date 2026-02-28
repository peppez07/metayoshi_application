import { ARR_PAYLOADS } from './arr'
import { BITCOIN_PAYLOADS } from './bitcoin'
import { ADA_PAYLOADS } from './cardano'
import { BTCZ_PAYLOADS } from './btcz'
import { createUtxoPayloadCatalog } from './common'
import { DASH_PAYLOADS } from './dash'
import { DOGE_PAYLOADS } from './doge'
import { FIRO_PAYLOADS } from './firo'
import { MANTAATLANTIC_PAYLOADS } from './manta-atlantic'
import { XMR_PAYLOADS } from './monero'
import { PIVX_PAYLOADS } from './pivx'
import { POLKADOT_PAYLOADS } from './polkadot'
import { RTM_PAYLOADS } from './rtm'
import { TERRACLASSIC_PAYLOADS } from './terra-classic'
import { TERRA_PAYLOADS } from './terra'
import { TIDE_PAYLOADS } from './tide'
import { XRP_PAYLOADS } from './xrp'
import { STANDARD_RUNTIME_META } from '../standardRuntimeMeta'
import { SERVER_SCAFFOLD_PAYLOADS_BY_NETWORK_ID } from './serverScaffolds'
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

const dynamicPayloadCatalogCache = new Map<string, CoinPayloadCatalog>()

function normalizePayloadNetworkId(networkId?: string): string {
  const normalized = String(networkId || '').trim().toLowerCase()
  if (!normalized) return ''
  if (normalized === 'btc' || normalized === 'bitcoin' || normalized === 'srv--btc') return 'srv--bitcoin'
  // Preserve scaffold IDs like "srv--bitcoin" and collapse only extra aliases
  // like "srv--bitcoin--alt" to their base scaffold key.
  if (normalized.startsWith('srv--')) {
    const parts = normalized.split('--')
    if (parts.length >= 2 && parts[1]) return `srv--${parts[1]}`
    return normalized
  }
  const aliasSep = normalized.indexOf('--')
  if (aliasSep > 0) return normalized.slice(0, aliasSep)
  return normalized
}

function createStandardPayloadCatalog(networkId: string): CoinPayloadCatalog | undefined {
  const meta = STANDARD_RUNTIME_META[networkId]
  if (!meta) return undefined
  return createUtxoPayloadCatalog({
    networkId,
    symbol: meta.symbol,
    coinId: meta.coinId,
    chain: 'main'
  })
}

export function getCoinPayloadCatalog(networkId?: string) {
  const key = normalizePayloadNetworkId(networkId)
  if (!key) return undefined
  const direct = PAYLOADS_BY_NETWORK_ID[key as keyof typeof PAYLOADS_BY_NETWORK_ID]
  if (direct) return direct
  const scaffolded = SERVER_SCAFFOLD_PAYLOADS_BY_NETWORK_ID[key]
  if (scaffolded) return scaffolded
  if (dynamicPayloadCatalogCache.has(key)) return dynamicPayloadCatalogCache.get(key)
  const dynamic = createStandardPayloadCatalog(key)
  if (dynamic) dynamicPayloadCatalogCache.set(key, dynamic)
  return dynamic
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
  ADA_PAYLOADS,
  BITCOIN_PAYLOADS,
  PIVX_PAYLOADS,
  DASH_PAYLOADS,
  TERRA_PAYLOADS,
  TERRACLASSIC_PAYLOADS,
  POLKADOT_PAYLOADS,
  MANTAATLANTIC_PAYLOADS
}

export type { CoinPayloadCatalog, CoinPayloadBuilders, JsonRpcEnvelope, UtxoTxInputRef } from './types'
