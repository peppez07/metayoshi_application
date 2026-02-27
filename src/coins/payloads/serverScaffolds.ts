import type { CoinPayloadCatalog } from './types'
import { BITCOIN_PAYLOADS } from './bitcoin'
import { PIVX_PAYLOADS } from './pivx'
import { DASH_PAYLOADS } from './dash'
import { TERRA_PAYLOADS } from './terra'
import { TERRACLASSIC_PAYLOADS } from './terra-classic'
import { POLKADOT_PAYLOADS } from './polkadot'
import { MANTAATLANTIC_PAYLOADS } from './manta-atlantic'
import { COSMOS_PAYLOADS } from './cosmos'

export const SERVER_SCAFFOLD_PAYLOADS_BY_NETWORK_ID: Record<string, CoinPayloadCatalog> = {
  'srv--cosmos': COSMOS_PAYLOADS,
  'srv--bitcoin': BITCOIN_PAYLOADS,
  'srv--pivx': PIVX_PAYLOADS,
  'srv--dash': DASH_PAYLOADS,
  'srv--terra': TERRA_PAYLOADS,
  'srv--terra-classic': TERRACLASSIC_PAYLOADS,
  'srv--polkadot': POLKADOT_PAYLOADS,
  'srv--manta-atlantic': MANTAATLANTIC_PAYLOADS
}
