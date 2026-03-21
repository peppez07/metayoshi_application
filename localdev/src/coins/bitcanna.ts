import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createCosmosCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const bitcannaModule = createCosmosCoinModule({
  id: 'bitcanna',
  name: 'BitCanna',
  bridgeCoinId: 'bitcanna',
  logo: getUnifiedLogoByName('bitcanna'),
  rpcEnvKey: 'VITE_BITCANNA_RPC',
  rpcUserEnvKey: 'VITE_BITCANNA_RPC_USER',
  rpcPasswordEnvKey: 'VITE_BITCANNA_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_BITCANNA_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_BITCANNA_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_BITCANNA_EXPLORER',
  defaultRpcUrl: '',
  defaultExplorerUrl: ''
})

export const BITCANNA_CAPABILITIES: NetworkCapabilitiesInput = bitcannaModule.capabilities
export const createBitcannaNetwork: (ctx: CoinRuntimeContext) => Network = bitcannaModule.createNetwork
export const bitcannaCoin: CoinModule = bitcannaModule.coin
