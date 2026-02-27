import { createModelPayloadCatalog } from './common'

export const PASSAGE_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--passage',
  symbol: 'PASSAG',
  coinId: 'passage',
  chain: 'main',
  model: 'utxo'
})
