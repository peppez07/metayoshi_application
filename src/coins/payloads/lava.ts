import { createModelPayloadCatalog } from './common'

export const LAVA_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--lava',
  symbol: 'LAVA',
  coinId: 'lava',
  chain: 'main',
  model: 'utxo'
})
