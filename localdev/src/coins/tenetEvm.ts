import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const tenetEvmModule = createEvmCoinModule({
  id: 'tenet-evm',
  name: 'Tenet',
  symbol: 'TENET',
  coinSymbol: 'TENET',
  chainId: 1559,
  bridgeCoinId: 'tenet-evm',
  logo: getUnifiedLogoByName('tenet'),
  rpcEnvKey: 'VITE_TENET_EVM_RPC',
  rpcUserEnvKey: 'VITE_TENET_EVM_RPC_USER',
  rpcPasswordEnvKey: 'VITE_TENET_EVM_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_TENET_EVM_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_TENET_EVM_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_TENET_EVM_EXPLORER',
  defaultExplorerUrl: 'https://tenetscan.io'
})

export const TENET_EVM_CAPABILITIES: NetworkCapabilitiesInput = tenetEvmModule.capabilities
export const createTenetEvmNetwork: (ctx: CoinRuntimeContext) => Network = tenetEvmModule.createNetwork
export const tenetEvmCoin: CoinModule = tenetEvmModule.coin
