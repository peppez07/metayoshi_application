import { createUtxoPayloadCatalog } from './common'

export const PIVX_PAYLOADS = createUtxoPayloadCatalog({
  networkId: 'srv--pivx',
  symbol: 'PIVX',
  coinId: 'pivx',
  chain: 'main'
})
