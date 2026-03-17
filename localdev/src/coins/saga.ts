import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createCosmosCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const sagaModule = createCosmosCoinModule({
  id: 'saga',
  name: 'Saga',
  bridgeCoinId: 'saga',
  logo: getUnifiedLogoByName('saga'),
  rpcEnvKey: 'VITE_SAGA_RPC',
  rpcUserEnvKey: 'VITE_SAGA_RPC_USER',
  rpcPasswordEnvKey: 'VITE_SAGA_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_SAGA_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_SAGA_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_SAGA_EXPLORER',
  defaultRpcUrl: 'https://saga-rpc.publicnode.com',
  defaultExplorerUrl: 'https://www.mintscan.io/saga'
})

export const SAGA_CAPABILITIES: NetworkCapabilitiesInput = sagaModule.capabilities
export const createSagaNetwork: (ctx: CoinRuntimeContext) => Network = sagaModule.createNetwork
export const sagaCoin: CoinModule = sagaModule.coin
