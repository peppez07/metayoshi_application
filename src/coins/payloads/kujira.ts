import { createModelPayloadCatalog } from './common'

export const KUJIRA_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--kujira',
  symbol: 'KUJIRA',
  coinId: 'kujira',
  chain: 'main',
  model: 'utxo'
})
