import { createModelPayloadCatalog } from './common'

export const POLKADOT_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--polkadot',
  symbol: 'POLKAD',
  coinId: 'polkadot',
  chain: 'main',
  model: 'utxo'
})
