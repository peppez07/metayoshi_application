import { createModelPayloadCatalog } from './common'

export const SOLANATESTNET_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--solana-testnet',
  symbol: 'SOLANA',
  coinId: 'solana-testnet',
  chain: 'main',
  model: 'sol'
})
