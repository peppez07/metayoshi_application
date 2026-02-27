import { createModelPayloadCatalog } from './common'

export const AVAIL_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--avail',
  symbol: 'AVAIL',
  coinId: 'avail',
  chain: 'main',
  model: 'utxo'
})
