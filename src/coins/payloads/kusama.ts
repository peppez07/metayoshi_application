import { createModelPayloadCatalog } from './common'

export const KUSAMA_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--kusama',
  symbol: 'KUSAMA',
  coinId: 'kusama',
  chain: 'main',
  model: 'utxo'
})
