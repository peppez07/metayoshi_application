import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createCosmosCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const teritoriModule = createCosmosCoinModule({
  id: 'teritori',
  name: 'Teritori',
  bridgeCoinId: 'teritori',
  logo: getUnifiedLogoByName('teritori'),
  rpcEnvKey: 'VITE_TERITORI_RPC',
  rpcUserEnvKey: 'VITE_TERITORI_RPC_USER',
  rpcPasswordEnvKey: 'VITE_TERITORI_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_TERITORI_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_TERITORI_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_TERITORI_EXPLORER',
  defaultRpcUrl: 'https://teritori-rpc.publicnode.com',
  defaultExplorerUrl: 'https://www.mintscan.io/teritori'
})

export const TERITORI_CAPABILITIES: NetworkCapabilitiesInput = teritoriModule.capabilities
export const createTeritoriNetwork: (ctx: CoinRuntimeContext) => Network = teritoriModule.createNetwork
export const teritoriCoin: CoinModule = teritoriModule.coin
