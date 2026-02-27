import { createModelPayloadCatalog } from './common'

export const EVMOSTESTNET_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--evmos-testnet',
  symbol: 'EVMOST',
  coinId: 'evmos-testnet',
  chain: 'main',
  model: 'utxo'
})
