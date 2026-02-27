import { createModelPayloadCatalog } from './common'

export const RIZON_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--rizon',
  symbol: 'RIZON',
  coinId: 'rizon',
  chain: 'main',
  model: 'utxo'
})
