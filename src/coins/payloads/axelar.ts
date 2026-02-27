import { createModelPayloadCatalog } from './common'

export const AXELAR_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--axelar',
  symbol: 'AXELAR',
  coinId: 'axelar',
  chain: 'main',
  model: 'utxo'
})
