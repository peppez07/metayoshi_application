import { createUtxoPayloadCatalog } from './common'

export const DOGE_PAYLOADS = createUtxoPayloadCatalog({
  networkId: 'doge',
  symbol: 'DOGE',
  coinId: 'dogecoin',
  chain: 'main'
})

