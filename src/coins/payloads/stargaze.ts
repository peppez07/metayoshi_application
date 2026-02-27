import { createModelPayloadCatalog } from './common'

export const STARGAZE_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--stargaze',
  symbol: 'STARGA',
  coinId: 'stargaze',
  chain: 'main',
  model: 'utxo'
})
