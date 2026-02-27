import { createModelPayloadCatalog } from './common'

export const ELYSTESTNET_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--elys-testnet',
  symbol: 'ELYSTE',
  coinId: 'elys-testnet',
  chain: 'main',
  model: 'utxo'
})
