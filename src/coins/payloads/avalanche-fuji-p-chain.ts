import { createModelPayloadCatalog } from './common'

export const AVALANCHEFUJIPCHAIN_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--avalanche-fuji-p-chain',
  symbol: 'AVALAN',
  coinId: 'avalanche-fuji-p-chain',
  chain: 'main',
  model: 'utxo'
})
