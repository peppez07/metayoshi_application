import { createModelPayloadCatalog } from './common'

export const CELESTIA_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--celestia',
  symbol: 'CELEST',
  coinId: 'celestia',
  chain: 'main',
  model: 'utxo'
})
