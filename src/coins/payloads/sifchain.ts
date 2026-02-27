import { createModelPayloadCatalog } from './common'

export const SIFCHAIN_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--sifchain',
  symbol: 'SIFCHA',
  coinId: 'sifchain',
  chain: 'main',
  model: 'utxo'
})
