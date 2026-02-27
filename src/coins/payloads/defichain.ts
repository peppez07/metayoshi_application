import { createModelPayloadCatalog } from './common'

export const DEFICHAIN_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--defichain',
  symbol: 'DEFICH',
  coinId: 'defichain',
  chain: 'main',
  model: 'utxo'
})
