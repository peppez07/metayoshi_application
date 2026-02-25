import { createUtxoPayloadCatalog } from './common'

export const XMR_PAYLOADS = createUtxoPayloadCatalog({
  networkId: 'xmr',
  symbol: 'XMR',
  coinId: 'monero',
  chain: 'main'
})

