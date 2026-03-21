import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createCosmosCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const junoModule = createCosmosCoinModule({
  id: 'juno',
  name: 'Juno',
  bridgeCoinId: 'juno',
  logo: getUnifiedLogoByName('juno'),
  rpcEnvKey: 'VITE_JUNO_RPC',
  rpcUserEnvKey: 'VITE_JUNO_RPC_USER',
  rpcPasswordEnvKey: 'VITE_JUNO_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_JUNO_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_JUNO_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_JUNO_EXPLORER',
  defaultRpcUrl: '',
  defaultExplorerUrl: ''
})

export const JUNO_CAPABILITIES: NetworkCapabilitiesInput = junoModule.capabilities
export const createJunoNetwork: (ctx: CoinRuntimeContext) => Network = junoModule.createNetwork
export const junoCoin: CoinModule = junoModule.coin
