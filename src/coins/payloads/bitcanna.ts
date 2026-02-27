import { createModelPayloadCatalog } from './common'

export const BITCANNA_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--bitcanna',
  symbol: 'BITCAN',
  coinId: 'bitcanna',
  chain: 'main',
  model: 'utxo'
})
