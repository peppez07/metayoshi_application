import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createCosmosCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const atomoneModule = createCosmosCoinModule({
  id: 'atomone',
  name: 'AtomOne',
  bridgeCoinId: 'atomone',
  logo: getUnifiedLogoByName('atomone'),
  rpcEnvKey: 'VITE_ATOMONE_RPC',
  rpcUserEnvKey: 'VITE_ATOMONE_RPC_USER',
  rpcPasswordEnvKey: 'VITE_ATOMONE_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_ATOMONE_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_ATOMONE_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_ATOMONE_EXPLORER',
  defaultRpcUrl: 'https://atomone-rpc.publicnode.com',
  defaultExplorerUrl: 'https://www.mintscan.io/atomone'
})

export const ATOMONE_CAPABILITIES: NetworkCapabilitiesInput = atomoneModule.capabilities
export const createAtomoneNetwork: (ctx: CoinRuntimeContext) => Network = atomoneModule.createNetwork
export const atomoneCoin: CoinModule = atomoneModule.coin
