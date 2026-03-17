import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createCosmosCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const stargazeModule = createCosmosCoinModule({
  id: 'stargaze',
  name: 'Stargaze',
  bridgeCoinId: 'stargaze',
  logo: getUnifiedLogoByName('stargaze'),
  rpcEnvKey: 'VITE_STARGAZE_RPC',
  rpcUserEnvKey: 'VITE_STARGAZE_RPC_USER',
  rpcPasswordEnvKey: 'VITE_STARGAZE_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_STARGAZE_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_STARGAZE_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_STARGAZE_EXPLORER',
  defaultRpcUrl: 'https://stargaze-rpc.publicnode.com',
  defaultExplorerUrl: 'https://www.mintscan.io/stargaze'
})

export const STARGAZE_CAPABILITIES: NetworkCapabilitiesInput = stargazeModule.capabilities
export const createStargazeNetwork: (ctx: CoinRuntimeContext) => Network = stargazeModule.createNetwork
export const stargazeCoin: CoinModule = stargazeModule.coin
