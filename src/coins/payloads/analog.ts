import { createModelPayloadCatalog } from './common'

export const ANALOG_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--analog',
  symbol: 'ANALOG',
  coinId: 'analog',
  chain: 'main',
  model: 'utxo'
})
