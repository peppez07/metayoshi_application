import { createModelPayloadCatalog } from './common'

export const ETHEREUMHOODI_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--ethereum-hoodi',
  symbol: 'ETHERE',
  coinId: 'ethereum-hoodi',
  chain: 'main',
  model: 'evm'
})
