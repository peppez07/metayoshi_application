import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const optimismSepoliaModule = createEvmCoinModule({
  id: 'optimism-sepolia',
  runtimeModelId: 'op',
  name: 'Optimism Sepolia',
  symbol: 'SepoliaETH',
  coinSymbol: 'SepoliaETH',
  chainId: 11155420,
  bridgeCoinId: 'optimism-sepolia',
  bridgeChain: 'main',
  displayChain: 'test',
  logo: getUnifiedLogoByName('optimism'),
  rpcEnvKey: 'VITE_OPTIMISM_SEPOLIA_RPC',
  rpcUserEnvKey: 'VITE_OPTIMISM_SEPOLIA_RPC_USER',
  rpcPasswordEnvKey: 'VITE_OPTIMISM_SEPOLIA_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_OPTIMISM_SEPOLIA_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_OPTIMISM_SEPOLIA_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_OPTIMISM_SEPOLIA_EXPLORER',
  defaultExplorerUrl: ''
})

export const OPTIMISM_SEPOLIA_CAPABILITIES: NetworkCapabilitiesInput = optimismSepoliaModule.capabilities
export const createOptimismSepoliaNetwork: (ctx: CoinRuntimeContext) => Network = optimismSepoliaModule.createNetwork
export const optimismSepoliaCoin: CoinModule = optimismSepoliaModule.coin
