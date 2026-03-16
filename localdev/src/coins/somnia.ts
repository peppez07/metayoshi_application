import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const somniaModule = createEvmCoinModule({
  id: 'somnia',
  name: 'Somnia',
  symbol: 'SOMI',
  coinSymbol: 'SOMI',
  chainId: 5031,
  bridgeCoinId: 'somnia',
  logo: getUnifiedLogoByName('somnia'),
  rpcEnvKey: 'VITE_SOMNIA_RPC',
  rpcUserEnvKey: 'VITE_SOMNIA_RPC_USER',
  rpcPasswordEnvKey: 'VITE_SOMNIA_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_SOMNIA_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_SOMNIA_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_SOMNIA_EXPLORER',
  defaultExplorerUrl: 'https://explorer.somnia.network'
})

export const SOMNIA_CAPABILITIES: NetworkCapabilitiesInput = somniaModule.capabilities
export const createSomniaNetwork: (ctx: CoinRuntimeContext) => Network = somniaModule.createNetwork
export const somniaCoin: CoinModule = somniaModule.coin
