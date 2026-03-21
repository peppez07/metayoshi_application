import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createCosmosCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const neutronModule = createCosmosCoinModule({
  id: 'neutron',
  name: 'Neutron',
  bridgeCoinId: 'neutron',
  logo: getUnifiedLogoByName('neutron'),
  rpcEnvKey: 'VITE_NEUTRON_RPC',
  rpcUserEnvKey: 'VITE_NEUTRON_RPC_USER',
  rpcPasswordEnvKey: 'VITE_NEUTRON_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_NEUTRON_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_NEUTRON_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_NEUTRON_EXPLORER',
  defaultRpcUrl: '',
  defaultExplorerUrl: ''
})

export const NEUTRON_CAPABILITIES: NetworkCapabilitiesInput = neutronModule.capabilities
export const createNeutronNetwork: (ctx: CoinRuntimeContext) => Network = neutronModule.createNetwork
export const neutronCoin: CoinModule = neutronModule.coin
