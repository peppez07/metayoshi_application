import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createCosmosCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const persistenceModule = createCosmosCoinModule({
  id: 'persistence',
  name: 'Persistence',
  bridgeCoinId: 'persistence',
  logo: getUnifiedLogoByName('persistence'),
  rpcEnvKey: 'VITE_PERSISTENCE_RPC',
  rpcUserEnvKey: 'VITE_PERSISTENCE_RPC_USER',
  rpcPasswordEnvKey: 'VITE_PERSISTENCE_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_PERSISTENCE_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_PERSISTENCE_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_PERSISTENCE_EXPLORER',
  defaultRpcUrl: 'https://persistence-rpc.publicnode.com',
  defaultExplorerUrl: 'https://www.mintscan.io/persistence'
})

export const PERSISTENCE_CAPABILITIES: NetworkCapabilitiesInput = persistenceModule.capabilities
export const createPersistenceNetwork: (ctx: CoinRuntimeContext) => Network = persistenceModule.createNetwork
export const persistenceCoin: CoinModule = persistenceModule.coin
