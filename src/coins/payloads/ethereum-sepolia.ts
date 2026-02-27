import { createModelPayloadCatalog } from './common'

export const ETHEREUMSEPOLIA_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--ethereum-sepolia',
  symbol: 'ETHERE',
  coinId: 'ethereum-sepolia',
  chain: 'main',
  model: 'evm'
})
