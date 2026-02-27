import { createModelPayloadCatalog } from './common'

export const BITCOIN_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--bitcoin',
  symbol: 'BTC',
  coinId: 'bitcoin',
  chain: 'main',
  model: 'utxo'
})
