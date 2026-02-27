import { createModelPayloadCatalog } from './common'

export const BABYLON_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--babylon',
  symbol: 'BABYLO',
  coinId: 'babylon',
  chain: 'main',
  model: 'utxo'
})
