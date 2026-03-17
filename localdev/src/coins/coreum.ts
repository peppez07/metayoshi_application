import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createCosmosCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const coreumModule = createCosmosCoinModule({
  id: 'coreum',
  name: 'Coreum',
  bridgeCoinId: 'coreum',
  logo: getUnifiedLogoByName('coreum'),
  rpcEnvKey: 'VITE_COREUM_RPC',
  rpcUserEnvKey: 'VITE_COREUM_RPC_USER',
  rpcPasswordEnvKey: 'VITE_COREUM_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_COREUM_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_COREUM_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_COREUM_EXPLORER',
  defaultRpcUrl: 'https://coreum-rpc.publicnode.com',
  defaultExplorerUrl: 'https://www.mintscan.io/coreum'
})

export const COREUM_CAPABILITIES: NetworkCapabilitiesInput = coreumModule.capabilities
export const createCoreumNetwork: (ctx: CoinRuntimeContext) => Network = coreumModule.createNetwork
export const coreumCoin: CoinModule = coreumModule.coin
