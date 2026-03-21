import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const moonriverModule = createEvmCoinModule({
  id: 'moonriver',
  name: 'Moonriver',
  symbol: 'MOVR',
  coinSymbol: 'MOVR',
  chainId: 1285,
  bridgeCoinId: 'moonriver',
  logo: getUnifiedLogoByName('moonriver'),
  rpcEnvKey: 'VITE_MOONRIVER_RPC',
  rpcUserEnvKey: 'VITE_MOONRIVER_RPC_USER',
  rpcPasswordEnvKey: 'VITE_MOONRIVER_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_MOONRIVER_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_MOONRIVER_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_MOONRIVER_EXPLORER',
  defaultExplorerUrl: ''
})

export const MOONRIVER_CAPABILITIES: NetworkCapabilitiesInput = moonriverModule.capabilities
export const createMoonriverNetwork: (ctx: CoinRuntimeContext) => Network = moonriverModule.createNetwork
export const moonriverCoin: CoinModule = moonriverModule.coin
