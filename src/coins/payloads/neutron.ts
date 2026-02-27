import { createModelPayloadCatalog } from './common'

export const NEUTRON_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--neutron',
  symbol: 'NEUTRO',
  coinId: 'neutron',
  chain: 'main',
  model: 'utxo'
})
