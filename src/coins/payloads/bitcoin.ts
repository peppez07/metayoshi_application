import { createUtxoPayloadCatalog } from './common'

export const BITCOIN_PAYLOADS = createUtxoPayloadCatalog({
  networkId: 'srv--bitcoin',
  symbol: 'BTC',
  coinId: 'bitcoin',
  chain: 'main'
})
