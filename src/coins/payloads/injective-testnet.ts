import { createModelPayloadCatalog } from './common'

export const INJECTIVETESTNET_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--injective-testnet',
  symbol: 'INJECT',
  coinId: 'injective-testnet',
  chain: 'main',
  model: 'utxo'
})
