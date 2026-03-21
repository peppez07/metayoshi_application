import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const wardenEvmModule = createEvmCoinModule({
  id: 'warden-evm',
  name: 'Warden',
  symbol: 'WARD',
  coinSymbol: 'WARD',
  chainId: 8765,
  bridgeCoinId: 'warden-evm',
  logo: getUnifiedLogoByName('warden'),
  rpcEnvKey: 'VITE_WARDEN_EVM_RPC',
  rpcUserEnvKey: 'VITE_WARDEN_EVM_RPC_USER',
  rpcPasswordEnvKey: 'VITE_WARDEN_EVM_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_WARDEN_EVM_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_WARDEN_EVM_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_WARDEN_EVM_EXPLORER',
  defaultExplorerUrl: ''
})

export const WARDEN_EVM_CAPABILITIES: NetworkCapabilitiesInput = wardenEvmModule.capabilities
export const createWardenEvmNetwork: (ctx: CoinRuntimeContext) => Network = wardenEvmModule.createNetwork
export const wardenEvmCoin: CoinModule = wardenEvmModule.coin
