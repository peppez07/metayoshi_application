import { createModelPayloadCatalog } from './common'

export const PULSECHAINTESTNET_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--pulsechain-testnet',
  symbol: 'PULSEC',
  coinId: 'pulsechain-testnet',
  chain: 'main',
  model: 'evm'
})
