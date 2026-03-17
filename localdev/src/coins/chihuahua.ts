import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createCosmosCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const chihuahuaModule = createCosmosCoinModule({
  id: 'chihuahua',
  name: 'Chihuahua',
  bridgeCoinId: 'chihuahua',
  logo: getUnifiedLogoByName('chihuahua'),
  rpcEnvKey: 'VITE_CHIHUAHUA_RPC',
  rpcUserEnvKey: 'VITE_CHIHUAHUA_RPC_USER',
  rpcPasswordEnvKey: 'VITE_CHIHUAHUA_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_CHIHUAHUA_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_CHIHUAHUA_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_CHIHUAHUA_EXPLORER',
  defaultRpcUrl: 'https://chihuahua-rpc.publicnode.com',
  defaultExplorerUrl: 'https://www.mintscan.io/chihuahua'
})

export const CHIHUAHUA_CAPABILITIES: NetworkCapabilitiesInput = chihuahuaModule.capabilities
export const createChihuahuaNetwork: (ctx: CoinRuntimeContext) => Network = chihuahuaModule.createNetwork
export const chihuahuaCoin: CoinModule = chihuahuaModule.coin
