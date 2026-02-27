import { createModelPayloadCatalog } from './common'

export const SHENTU_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--shentu',
  symbol: 'SHENTU',
  coinId: 'shentu',
  chain: 'main',
  model: 'utxo'
})
