import { createUtxoPayloadCatalog } from './common'

export const XRP_PAYLOADS = createUtxoPayloadCatalog({
  networkId: 'xrp',
  symbol: 'XRP',
  coinId: 'xrp',
  chain: 'main'
})

