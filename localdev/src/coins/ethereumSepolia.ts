import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const ethereumSepoliaModule = createEvmCoinModule({
  id: 'ethereum-sepolia',
  runtimeModelId: 'eth',
  name: 'Ethereum Sepolia',
  symbol: 'SepoliaETH',
  coinSymbol: 'SepoliaETH',
  chainId: 11155111,
  bridgeCoinId: 'ethereum-sepolia',
  bridgeChain: 'main',
  displayChain: 'test',
  logo: getUnifiedLogoByName('ethereum'),
  rpcEnvKey: 'VITE_ETHEREUM_SEPOLIA_RPC',
  rpcUserEnvKey: 'VITE_ETHEREUM_SEPOLIA_RPC_USER',
  rpcPasswordEnvKey: 'VITE_ETHEREUM_SEPOLIA_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_ETHEREUM_SEPOLIA_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_ETHEREUM_SEPOLIA_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_ETHEREUM_SEPOLIA_EXPLORER',
  defaultExplorerUrl: ''
})

export const ETHEREUM_SEPOLIA_CAPABILITIES: NetworkCapabilitiesInput = ethereumSepoliaModule.capabilities
export const createEthereumSepoliaNetwork: (ctx: CoinRuntimeContext) => Network = ethereumSepoliaModule.createNetwork
export const ethereumSepoliaCoin: CoinModule = ethereumSepoliaModule.coin
