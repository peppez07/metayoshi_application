import { createModelPayloadCatalog } from './common'

export const TERRACLASSIC_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--terra-classic',
  symbol: 'TERRAC',
  coinId: 'terra-classic',
  chain: 'main',
  model: 'utxo'
})
