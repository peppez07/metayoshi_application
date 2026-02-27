import { createModelPayloadCatalog } from './common'

export const TAIKOHOODI_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--taiko-hoodi',
  symbol: 'TAIKOH',
  coinId: 'taiko-hoodi',
  chain: 'main',
  model: 'evm'
})
