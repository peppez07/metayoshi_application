import { createModelPayloadCatalog } from './common'

export const TERITORI_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--teritori',
  symbol: 'TERITO',
  coinId: 'teritori',
  chain: 'main',
  model: 'utxo'
})
