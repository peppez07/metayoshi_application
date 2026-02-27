import { createModelPayloadCatalog } from './common'

export const OPBNBTESTNET_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--opbnb-testnet',
  symbol: 'OPBNBT',
  coinId: 'opbnb-testnet',
  chain: 'main',
  model: 'evm'
})
