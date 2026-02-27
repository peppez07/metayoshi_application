import { createModelPayloadCatalog } from './common'

export const COMDEX_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--comdex',
  symbol: 'COMDEX',
  coinId: 'comdex',
  chain: 'main',
  model: 'utxo'
})
