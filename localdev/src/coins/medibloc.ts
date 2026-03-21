import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createCosmosCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const mediblocModule = createCosmosCoinModule({
  id: 'medibloc',
  name: 'Medibloc',
  bridgeCoinId: 'medibloc',
  logo: getUnifiedLogoByName('medibloc'),
  rpcEnvKey: 'VITE_MEDIBLOC_RPC',
  rpcUserEnvKey: 'VITE_MEDIBLOC_RPC_USER',
  rpcPasswordEnvKey: 'VITE_MEDIBLOC_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_MEDIBLOC_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_MEDIBLOC_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_MEDIBLOC_EXPLORER',
  defaultRpcUrl: '',
  defaultExplorerUrl: ''
})

export const MEDIBLOC_CAPABILITIES: NetworkCapabilitiesInput = mediblocModule.capabilities
export const createMediblocNetwork: (ctx: CoinRuntimeContext) => Network = mediblocModule.createNetwork
export const mediblocCoin: CoinModule = mediblocModule.coin
