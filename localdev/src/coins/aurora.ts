import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const auroraModule = createEvmCoinModule({
  id: 'aurora',
  name: 'Aurora',
  symbol: 'ETH',
  coinSymbol: 'ETH',
  chainId: 1313161554,
  bridgeCoinId: 'aurora',
  logo: getUnifiedLogoByName('aurora'),
  rpcEnvKey: 'VITE_AURORA_RPC',
  rpcUserEnvKey: 'VITE_AURORA_RPC_USER',
  rpcPasswordEnvKey: 'VITE_AURORA_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_AURORA_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_AURORA_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_AURORA_EXPLORER',
  defaultExplorerUrl: 'https://explorer.aurora.dev'
})

export const AURORA_CAPABILITIES: NetworkCapabilitiesInput = auroraModule.capabilities
export const createAuroraNetwork: (ctx: CoinRuntimeContext) => Network = auroraModule.createNetwork
export const auroraCoin: CoinModule = auroraModule.coin
