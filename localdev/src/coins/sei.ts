import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createCosmosCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const seiModule = createCosmosCoinModule({
  id: 'sei',
  name: 'Sei',
  bridgeCoinId: 'sei',
  logo: getUnifiedLogoByName('sei'),
  rpcEnvKey: 'VITE_SEI_RPC',
  rpcUserEnvKey: 'VITE_SEI_RPC_USER',
  rpcPasswordEnvKey: 'VITE_SEI_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_SEI_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_SEI_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_SEI_EXPLORER',
  defaultRpcUrl: '',
  defaultExplorerUrl: ''
})

export const SEI_CAPABILITIES: NetworkCapabilitiesInput = seiModule.capabilities
export const createSeiNetwork: (ctx: CoinRuntimeContext) => Network = seiModule.createNetwork
export const seiCoin: CoinModule = seiModule.coin
