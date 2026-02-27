import { createModelPayloadCatalog } from './common'

export const POLKADOT_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--polkadot',
  symbol: 'DOT',
  coinId: 'polkadot',
  chain: 'main',
  model: 'utxo'
})
