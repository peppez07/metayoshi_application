import { createModelPayloadCatalog } from './common'

export const NOLUS_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--nolus',
  symbol: 'NOLUS',
  coinId: 'nolus',
  chain: 'main',
  model: 'utxo'
})
