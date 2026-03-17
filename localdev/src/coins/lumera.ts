import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createCosmosCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const lumeraModule = createCosmosCoinModule({
  id: 'lumera',
  name: 'Lumera',
  bridgeCoinId: 'lumera',
  logo: getUnifiedLogoByName('lumera-health'),
  rpcEnvKey: 'VITE_LUMERA_RPC',
  rpcUserEnvKey: 'VITE_LUMERA_RPC_USER',
  rpcPasswordEnvKey: 'VITE_LUMERA_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_LUMERA_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_LUMERA_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_LUMERA_EXPLORER',
  defaultRpcUrl: 'https://lumera-rpc.publicnode.com',
  defaultExplorerUrl: 'https://www.mintscan.io/lumera'
})

export const LUMERA_CAPABILITIES: NetworkCapabilitiesInput = lumeraModule.capabilities
export const createLumeraNetwork: (ctx: CoinRuntimeContext) => Network = lumeraModule.createNetwork
export const lumeraCoin: CoinModule = lumeraModule.coin
