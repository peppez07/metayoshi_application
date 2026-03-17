import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createCosmosCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const quicksilverModule = createCosmosCoinModule({
  id: 'quicksilver',
  name: 'Quicksilver',
  bridgeCoinId: 'quicksilver',
  logo: getUnifiedLogoByName('quicksilver'),
  rpcEnvKey: 'VITE_QUICKSILVER_RPC',
  rpcUserEnvKey: 'VITE_QUICKSILVER_RPC_USER',
  rpcPasswordEnvKey: 'VITE_QUICKSILVER_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_QUICKSILVER_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_QUICKSILVER_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_QUICKSILVER_EXPLORER',
  defaultRpcUrl: 'https://quicksilver-rpc.publicnode.com',
  defaultExplorerUrl: 'https://www.mintscan.io/quicksilver'
})

export const QUICKSILVER_CAPABILITIES: NetworkCapabilitiesInput = quicksilverModule.capabilities
export const createQuicksilverNetwork: (ctx: CoinRuntimeContext) => Network = quicksilverModule.createNetwork
export const quicksilverCoin: CoinModule = quicksilverModule.coin
