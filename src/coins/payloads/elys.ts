import { createModelPayloadCatalog } from './common'

export const ELYS_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--elys',
  symbol: 'ELYS',
  coinId: 'elys',
  chain: 'main',
  model: 'utxo'
})
