import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createCosmosCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const cosmosModule = createCosmosCoinModule({
  id: 'cosmos',
  name: 'Cosmos Hub',
  symbol: 'ATOM',
  coinSymbol: 'ATOM',
  bridgeCoinId: 'cosmos',
  logo: getUnifiedLogoByName('cosmos'),
  rpcEnvKey: 'VITE_COSMOS_RPC',
  rpcUserEnvKey: 'VITE_COSMOS_RPC_USER',
  rpcPasswordEnvKey: 'VITE_COSMOS_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_COSMOS_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_COSMOS_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_COSMOS_EXPLORER',
  defaultRpcUrl: '',
  defaultExplorerUrl: ''
})

export const COSMOS_CAPABILITIES: NetworkCapabilitiesInput = cosmosModule.capabilities
export const createCosmosNetwork: (ctx: CoinRuntimeContext) => Network = cosmosModule.createNetwork
export const cosmosCoin: CoinModule = cosmosModule.coin
