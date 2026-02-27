import { createModelPayloadCatalog } from './common'

export const PERSISTENCE_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--persistence',
  symbol: 'PERSIS',
  coinId: 'persistence',
  chain: 'main',
  model: 'utxo'
})
