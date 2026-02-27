import { createModelPayloadCatalog } from './common'

export const EVMOSTESTNETEVM_PAYLOADS = createModelPayloadCatalog({
  networkId: 'srv--evmos-testnet-evm',
  symbol: 'EVMOST',
  coinId: 'evmos-testnet-evm',
  chain: 'main',
  model: 'evm'
})
