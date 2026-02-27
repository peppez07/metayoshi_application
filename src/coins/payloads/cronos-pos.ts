import { createModelPayloadCatalog } from './common'

export const CRONOSPOS_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--cronos-pos',
  symbol: 'CRONOS',
  coinId: 'cronos-pos',
  chain: 'main',
  model: 'utxo'
})
