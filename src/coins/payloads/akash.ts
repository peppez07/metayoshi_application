import { createModelPayloadCatalog } from './common'

export const AKASH_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--akash',
  symbol: 'AKASH',
  coinId: 'akash',
  chain: 'main',
  model: 'utxo'
})
