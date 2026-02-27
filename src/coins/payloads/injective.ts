import { createModelPayloadCatalog } from './common'

export const INJECTIVE_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--injective',
  symbol: 'INJECT',
  coinId: 'injective',
  chain: 'main',
  model: 'utxo'
})
