import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createCosmosCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const celestiaModule = createCosmosCoinModule({
  id: 'celestia',
  name: 'Celestia',
  bridgeCoinId: 'celestia',
  logo: getUnifiedLogoByName('celestia'),
  rpcEnvKey: 'VITE_CELESTIA_RPC',
  rpcUserEnvKey: 'VITE_CELESTIA_RPC_USER',
  rpcPasswordEnvKey: 'VITE_CELESTIA_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_CELESTIA_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_CELESTIA_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_CELESTIA_EXPLORER',
  defaultRpcUrl: '',
  defaultExplorerUrl: ''
})

export const CELESTIA_CAPABILITIES: NetworkCapabilitiesInput = celestiaModule.capabilities
export const createCelestiaNetwork: (ctx: CoinRuntimeContext) => Network = celestiaModule.createNetwork
export const celestiaCoin: CoinModule = celestiaModule.coin
