import { createModelPayloadCatalog } from './common'

export const MEDIBLOC_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--medibloc',
  symbol: 'MEDIBL',
  coinId: 'medibloc',
  chain: 'main',
  model: 'utxo'
})
