import { createModelPayloadCatalog } from './common'

export const FETCH_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--fetch',
  symbol: 'FETCH',
  coinId: 'fetch',
  chain: 'main',
  model: 'utxo'
})
