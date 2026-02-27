import { createModelPayloadCatalog } from './common'

export const QUICKSILVER_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--quicksilver',
  symbol: 'QUICKS',
  coinId: 'quicksilver',
  chain: 'main',
  model: 'utxo'
})
