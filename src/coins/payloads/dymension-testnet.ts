import { createModelPayloadCatalog } from './common'

export const DYMENSIONTESTNET_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--dymension-testnet',
  symbol: 'DYMENS',
  coinId: 'dymension-testnet',
  chain: 'main',
  model: 'utxo'
})
