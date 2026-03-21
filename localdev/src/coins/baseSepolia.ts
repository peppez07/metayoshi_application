import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const baseSepoliaModule = createEvmCoinModule({
  id: 'base-sepolia',
  runtimeModelId: 'base',
  name: 'Base Sepolia',
  symbol: 'SepoliaETH',
  coinSymbol: 'SepoliaETH',
  chainId: 84532,
  bridgeCoinId: 'base-sepolia',
  bridgeChain: 'main',
  displayChain: 'test',
  logo: getUnifiedLogoByName('base'),
  rpcEnvKey: 'VITE_BASE_SEPOLIA_RPC',
  rpcUserEnvKey: 'VITE_BASE_SEPOLIA_RPC_USER',
  rpcPasswordEnvKey: 'VITE_BASE_SEPOLIA_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_BASE_SEPOLIA_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_BASE_SEPOLIA_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_BASE_SEPOLIA_EXPLORER',
  defaultExplorerUrl: ''
})

export const BASE_SEPOLIA_CAPABILITIES: NetworkCapabilitiesInput = baseSepoliaModule.capabilities
export const createBaseSepoliaNetwork: (ctx: CoinRuntimeContext) => Network = baseSepoliaModule.createNetwork
export const baseSepoliaCoin: CoinModule = baseSepoliaModule.coin
