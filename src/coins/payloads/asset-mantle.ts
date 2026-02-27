import { createModelPayloadCatalog } from './common'

export const ASSETMANTLE_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--asset-mantle',
  symbol: 'ASSETM',
  coinId: 'asset-mantle',
  chain: 'main',
  model: 'utxo'
})
