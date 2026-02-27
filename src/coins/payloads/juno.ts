import { createModelPayloadCatalog } from './common'

export const JUNO_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--juno',
  symbol: 'JUNO',
  coinId: 'juno',
  chain: 'main',
  model: 'utxo'
})
