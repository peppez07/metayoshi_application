import { createModelPayloadCatalog } from './common'

export const BITWAY_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--bitway',
  symbol: 'BITWAY',
  coinId: 'bitway',
  chain: 'main',
  model: 'utxo'
})
