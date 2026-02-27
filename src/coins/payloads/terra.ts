import { createModelPayloadCatalog } from './common'

export const TERRA_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--terra',
  symbol: 'LUNA',
  coinId: 'terra',
  chain: 'main',
  model: 'cosmos'
})
