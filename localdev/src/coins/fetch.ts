import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createCosmosCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const fetchModule = createCosmosCoinModule({
  id: 'fetch',
  name: 'Fetch',
  bridgeCoinId: 'fetch',
  logo: getUnifiedLogoByName('fetch'),
  rpcEnvKey: 'VITE_FETCH_RPC',
  rpcUserEnvKey: 'VITE_FETCH_RPC_USER',
  rpcPasswordEnvKey: 'VITE_FETCH_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_FETCH_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_FETCH_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_FETCH_EXPLORER',
  defaultRpcUrl: '',
  defaultExplorerUrl: ''
})

export const FETCH_CAPABILITIES: NetworkCapabilitiesInput = fetchModule.capabilities
export const createFetchNetwork: (ctx: CoinRuntimeContext) => Network = fetchModule.createNetwork
export const fetchCoin: CoinModule = fetchModule.coin
