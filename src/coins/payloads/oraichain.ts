import { createModelPayloadCatalog } from './common'

export const ORAICHAIN_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--oraichain',
  symbol: 'ORAICH',
  coinId: 'oraichain',
  chain: 'main',
  model: 'utxo'
})
