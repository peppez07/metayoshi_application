import { createUtxoPayloadCatalog } from './common'

export const TIDE_PAYLOADS = createUtxoPayloadCatalog({
  networkId: 'tide',
  symbol: 'TIDE',
  coinId: 'tidecoin',
  chain: 'main'
})

