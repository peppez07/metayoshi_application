import { createModelPayloadCatalog } from './common'

export const STRIDE_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--stride',
  symbol: 'STRIDE',
  coinId: 'stride',
  chain: 'main',
  model: 'utxo'
})
