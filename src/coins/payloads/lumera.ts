import { createModelPayloadCatalog } from './common'

export const LUMERA_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--lumera',
  symbol: 'LUMERA',
  coinId: 'lumera',
  chain: 'main',
  model: 'utxo'
})
