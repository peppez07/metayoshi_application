import { createModelPayloadCatalog } from './common'

export const COREUM_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--coreum',
  symbol: 'COREUM',
  coinId: 'coreum',
  chain: 'main',
  model: 'utxo'
})
