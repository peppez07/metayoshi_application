import { createModelPayloadCatalog } from './common'

export const REBUS_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--rebus',
  symbol: 'REBUS',
  coinId: 'rebus',
  chain: 'main',
  model: 'utxo'
})
