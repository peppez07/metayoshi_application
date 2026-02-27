import { createModelPayloadCatalog } from './common'

export const TERRA_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--terra',
  symbol: 'TERRA',
  coinId: 'terra',
  chain: 'main',
  model: 'utxo'
})
