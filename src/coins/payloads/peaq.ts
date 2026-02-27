import { createModelPayloadCatalog } from './common'

export const PEAQ_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--peaq',
  symbol: 'PEAQ',
  coinId: 'peaq',
  chain: 'main',
  model: 'utxo'
})
