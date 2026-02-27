import { createModelPayloadCatalog } from './common'

export const BITCOINTESTNET_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--bitcoin-testnet',
  symbol: 'BTC',
  coinId: 'bitcoin-testnet',
  chain: 'main',
  model: 'utxo'
})
