import { createModelPayloadCatalog } from './common'

export const DORA_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--dora',
  symbol: 'DORA',
  coinId: 'dora',
  chain: 'main',
  model: 'utxo'
})
