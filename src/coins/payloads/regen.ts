import { createModelPayloadCatalog } from './common'

export const REGEN_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--regen',
  symbol: 'REGEN',
  coinId: 'regen',
  chain: 'main',
  model: 'utxo'
})
