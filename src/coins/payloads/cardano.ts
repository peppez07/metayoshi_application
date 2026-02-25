import { createUtxoPayloadCatalog } from './common'

export const ADA_PAYLOADS = createUtxoPayloadCatalog({
  networkId: 'ada',
  symbol: 'ADA',
  coinId: 'cardano',
  chain: 'main'
})

