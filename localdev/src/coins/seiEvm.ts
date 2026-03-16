import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const seiEvmModule = createEvmCoinModule({
  id: 'sei-evm',
  name: 'Sei',
  symbol: 'SEI',
  coinSymbol: 'SEI',
  chainId: 1329,
  bridgeCoinId: 'sei-evm',
  logo: getUnifiedLogoByName('sei'),
  rpcEnvKey: 'VITE_SEI_EVM_RPC',
  rpcUserEnvKey: 'VITE_SEI_EVM_RPC_USER',
  rpcPasswordEnvKey: 'VITE_SEI_EVM_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_SEI_EVM_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_SEI_EVM_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_SEI_EVM_EXPLORER',
  defaultExplorerUrl: 'https://seistream.app'
})

export const SEI_EVM_CAPABILITIES: NetworkCapabilitiesInput = seiEvmModule.capabilities
export const createSeiEvmNetwork: (ctx: CoinRuntimeContext) => Network = seiEvmModule.createNetwork
export const seiEvmCoin: CoinModule = seiEvmModule.coin
