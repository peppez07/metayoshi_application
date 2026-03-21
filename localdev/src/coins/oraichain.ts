import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createCosmosCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const oraichainModule = createCosmosCoinModule({
  id: 'oraichain',
  name: 'Oraichain',
  bridgeCoinId: 'oraichain',
  logo: getUnifiedLogoByName('oraichain-token'),
  rpcEnvKey: 'VITE_ORAICHAIN_RPC',
  rpcUserEnvKey: 'VITE_ORAICHAIN_RPC_USER',
  rpcPasswordEnvKey: 'VITE_ORAICHAIN_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_ORAICHAIN_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_ORAICHAIN_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_ORAICHAIN_EXPLORER',
  defaultRpcUrl: '',
  defaultExplorerUrl: ''
})

export const ORAICHAIN_CAPABILITIES: NetworkCapabilitiesInput = oraichainModule.capabilities
export const createOraichainNetwork: (ctx: CoinRuntimeContext) => Network = oraichainModule.createNetwork
export const oraichainCoin: CoinModule = oraichainModule.coin
