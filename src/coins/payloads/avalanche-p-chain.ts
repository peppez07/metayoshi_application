import { createModelPayloadCatalog } from './common'

export const AVALANCHEPCHAIN_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--avalanche-p-chain',
  symbol: 'AVALAN',
  coinId: 'avalanche-p-chain',
  chain: 'main',
  model: 'utxo'
})
