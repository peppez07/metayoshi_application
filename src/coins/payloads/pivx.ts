import { createModelPayloadCatalog } from './common'

export const PIVX_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--pivx',
  symbol: 'PIVX',
  coinId: 'pivx',
  chain: 'main',
  model: 'utxo'
})
