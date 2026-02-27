import { createModelPayloadCatalog } from './common'

export const SENTINEL_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--sentinel',
  symbol: 'SENTIN',
  coinId: 'sentinel',
  chain: 'main',
  model: 'utxo'
})
