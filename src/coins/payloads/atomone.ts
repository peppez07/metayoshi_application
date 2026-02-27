import { createModelPayloadCatalog } from './common'

export const ATOMONE_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--atomone',
  symbol: 'ATOMON',
  coinId: 'atomone',
  chain: 'main',
  model: 'utxo'
})
