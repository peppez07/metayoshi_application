import { createModelPayloadCatalog } from './common'

export const BSCTESTNET_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--bsc-testnet',
  symbol: 'BSCTES',
  coinId: 'bsc-testnet',
  chain: 'main',
  model: 'evm'
})
