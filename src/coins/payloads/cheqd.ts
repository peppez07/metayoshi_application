import { createModelPayloadCatalog } from './common'

export const CHEQD_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--cheqd',
  symbol: 'CHEQD',
  coinId: 'cheqd',
  chain: 'main',
  model: 'utxo'
})
