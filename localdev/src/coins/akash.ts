import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createCosmosCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const akashModule = createCosmosCoinModule({
  id: 'akash',
  name: 'Akash',
  bridgeCoinId: 'akash',
  logo: getUnifiedLogoByName('akash-network'),
  rpcEnvKey: 'VITE_AKASH_RPC',
  rpcUserEnvKey: 'VITE_AKASH_RPC_USER',
  rpcPasswordEnvKey: 'VITE_AKASH_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_AKASH_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_AKASH_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_AKASH_EXPLORER',
  defaultRpcUrl: '',
  defaultExplorerUrl: ''
})

export const AKASH_CAPABILITIES: NetworkCapabilitiesInput = akashModule.capabilities
export const createAkashNetwork: (ctx: CoinRuntimeContext) => Network = akashModule.createNetwork
export const akashCoin: CoinModule = akashModule.coin
