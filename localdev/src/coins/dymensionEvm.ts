import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const dymensionEvmModule = createEvmCoinModule({
  id: 'dymension-evm',
  name: 'Dymension',
  symbol: 'DYM',
  coinSymbol: 'DYM',
  chainId: 1100,
  bridgeCoinId: 'dymension-evm',
  logo: getUnifiedLogoByName('dymension'),
  rpcEnvKey: 'VITE_DYMENSION_EVM_RPC',
  rpcUserEnvKey: 'VITE_DYMENSION_EVM_RPC_USER',
  rpcPasswordEnvKey: 'VITE_DYMENSION_EVM_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_DYMENSION_EVM_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_DYMENSION_EVM_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_DYMENSION_EVM_EXPLORER',
  defaultExplorerUrl: ''
})

export const DYMENSION_EVM_CAPABILITIES: NetworkCapabilitiesInput = dymensionEvmModule.capabilities
export const createDymensionEvmNetwork: (ctx: CoinRuntimeContext) => Network = dymensionEvmModule.createNetwork
export const dymensionEvmCoin: CoinModule = dymensionEvmModule.coin
