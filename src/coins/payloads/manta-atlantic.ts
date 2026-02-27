import { createModelPayloadCatalog } from './common'

export const MANTAATLANTIC_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--manta-atlantic',
  symbol: 'MANTA',
  coinId: 'manta-atlantic',
  chain: 'main',
  model: 'evm'
})
