import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createCosmosCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const nolusModule = createCosmosCoinModule({
  id: 'nolus',
  name: 'Nolus',
  bridgeCoinId: 'nolus',
  logo: getUnifiedLogoByName('nolus-io'),
  rpcEnvKey: 'VITE_NOLUS_RPC',
  rpcUserEnvKey: 'VITE_NOLUS_RPC_USER',
  rpcPasswordEnvKey: 'VITE_NOLUS_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_NOLUS_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_NOLUS_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_NOLUS_EXPLORER',
  defaultRpcUrl: '',
  defaultExplorerUrl: ''
})

export const NOLUS_CAPABILITIES: NetworkCapabilitiesInput = nolusModule.capabilities
export const createNolusNetwork: (ctx: CoinRuntimeContext) => Network = nolusModule.createNetwork
export const nolusCoin: CoinModule = nolusModule.coin
