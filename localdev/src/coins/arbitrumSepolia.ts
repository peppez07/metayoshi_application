import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const arbitrumSepoliaModule = createEvmCoinModule({
  id: 'arbitrum-sepolia',
  runtimeModelId: 'arb',
  name: 'Arbitrum Sepolia',
  symbol: 'SepoliaETH',
  coinSymbol: 'SepoliaETH',
  chainId: 421614,
  bridgeCoinId: 'arbitrum-sepolia',
  bridgeChain: 'main',
  displayChain: 'test',
  logo: getUnifiedLogoByName('arbitrum'),
  rpcEnvKey: 'VITE_ARBITRUM_SEPOLIA_RPC',
  rpcUserEnvKey: 'VITE_ARBITRUM_SEPOLIA_RPC_USER',
  rpcPasswordEnvKey: 'VITE_ARBITRUM_SEPOLIA_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_ARBITRUM_SEPOLIA_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_ARBITRUM_SEPOLIA_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_ARBITRUM_SEPOLIA_EXPLORER',
  defaultExplorerUrl: 'https://sepolia.arbiscan.io'
})

export const ARBITRUM_SEPOLIA_CAPABILITIES: NetworkCapabilitiesInput = arbitrumSepoliaModule.capabilities
export const createArbitrumSepoliaNetwork: (ctx: CoinRuntimeContext) => Network = arbitrumSepoliaModule.createNetwork
export const arbitrumSepoliaCoin: CoinModule = arbitrumSepoliaModule.coin
