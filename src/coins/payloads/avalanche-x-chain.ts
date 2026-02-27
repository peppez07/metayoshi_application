import { createModelPayloadCatalog } from './common'

export const AVALANCHEXCHAIN_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--avalanche-x-chain',
  symbol: 'AVALAN',
  coinId: 'avalanche-x-chain',
  chain: 'main',
  model: 'utxo'
})
