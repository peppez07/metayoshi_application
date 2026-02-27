import { createModelPayloadCatalog } from './common'

export const DASH_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--dash',
  symbol: 'DASH',
  coinId: 'dash',
  chain: 'main',
  model: 'utxo'
})
