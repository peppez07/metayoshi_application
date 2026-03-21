import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const soneiumModule = createEvmCoinModule({
  id: 'soneium',
  name: 'Soneium',
  symbol: 'ETH',
  coinSymbol: 'ETH',
  chainId: 1868,
  bridgeCoinId: 'soneium',
  logo: getUnifiedLogoByName('soneium'),
  rpcEnvKey: 'VITE_SONEIUM_RPC',
  rpcUserEnvKey: 'VITE_SONEIUM_RPC_USER',
  rpcPasswordEnvKey: 'VITE_SONEIUM_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_SONEIUM_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_SONEIUM_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_SONEIUM_EXPLORER',
  defaultExplorerUrl: ''
})

export const SONEIUM_CAPABILITIES: NetworkCapabilitiesInput = soneiumModule.capabilities
export const createSoneiumNetwork: (ctx: CoinRuntimeContext) => Network = soneiumModule.createNetwork
export const soneiumCoin: CoinModule = soneiumModule.coin
