import { createModelPayloadCatalog } from './common'

export const DYDX_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--dydx',
  symbol: 'DYDX',
  coinId: 'dydx',
  chain: 'main',
  model: 'utxo'
})
