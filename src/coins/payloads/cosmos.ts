import { createModelPayloadCatalog } from './common'

export const COSMOS_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--cosmos',
  symbol: 'COSMOS',
  coinId: 'cosmos',
  chain: 'main',
  model: 'utxo'
})
