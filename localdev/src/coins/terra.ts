import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createCosmosCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const terraModule = createCosmosCoinModule({
  id: 'terra',
  name: 'Terra',
  bridgeCoinId: 'terra',
  logo: getUnifiedLogoByName('terra'),
  rpcEnvKey: 'VITE_TERRA_RPC',
  rpcUserEnvKey: 'VITE_TERRA_RPC_USER',
  rpcPasswordEnvKey: 'VITE_TERRA_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_TERRA_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_TERRA_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_TERRA_EXPLORER',
  defaultRpcUrl: '',
  defaultExplorerUrl: ''
})

export const TERRA_CAPABILITIES: NetworkCapabilitiesInput = terraModule.capabilities
export const createTerraNetwork: (ctx: CoinRuntimeContext) => Network = terraModule.createNetwork
export const terraCoin: CoinModule = terraModule.coin
