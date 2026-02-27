import { createModelPayloadCatalog } from './common'

export const CELER_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--celer',
  symbol: 'CELER',
  coinId: 'celer',
  chain: 'main',
  model: 'utxo'
})
