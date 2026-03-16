import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const mantleModule = createEvmCoinModule({
  id: 'mantle',
  name: 'Mantle',
  symbol: 'MNT',
  coinSymbol: 'MNT',
  chainId: 5000,
  bridgeCoinId: 'mantle',
  logo: getUnifiedLogoByName('mantle'),
  rpcEnvKey: 'VITE_MANTLE_RPC',
  rpcUserEnvKey: 'VITE_MANTLE_RPC_USER',
  rpcPasswordEnvKey: 'VITE_MANTLE_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_MANTLE_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_MANTLE_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_MANTLE_EXPLORER',
  defaultExplorerUrl: 'https://mantlescan.xyz'
})

export const MANTLE_CAPABILITIES: NetworkCapabilitiesInput = mantleModule.capabilities
export const createMantleNetwork: (ctx: CoinRuntimeContext) => Network = mantleModule.createNetwork
export const mantleCoin: CoinModule = mantleModule.coin
