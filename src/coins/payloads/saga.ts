import { createModelPayloadCatalog } from './common'

export const SAGA_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--saga',
  symbol: 'SAGA',
  coinId: 'saga',
  chain: 'main',
  model: 'utxo'
})
