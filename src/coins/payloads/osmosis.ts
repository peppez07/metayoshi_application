import { createModelPayloadCatalog } from './common'

export const OSMOSIS_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--osmosis',
  symbol: 'OSMOSI',
  coinId: 'osmosis',
  chain: 'main',
  model: 'utxo'
})
