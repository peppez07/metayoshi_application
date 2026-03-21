import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createCosmosCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const comdexModule = createCosmosCoinModule({
  id: 'comdex',
  name: 'Comdex',
  bridgeCoinId: 'comdex',
  logo: getUnifiedLogoByName('comdex'),
  rpcEnvKey: 'VITE_COMDEX_RPC',
  rpcUserEnvKey: 'VITE_COMDEX_RPC_USER',
  rpcPasswordEnvKey: 'VITE_COMDEX_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_COMDEX_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_COMDEX_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_COMDEX_EXPLORER',
  defaultRpcUrl: '',
  defaultExplorerUrl: ''
})

export const COMDEX_CAPABILITIES: NetworkCapabilitiesInput = comdexModule.capabilities
export const createComdexNetwork: (ctx: CoinRuntimeContext) => Network = comdexModule.createNetwork
export const comdexCoin: CoinModule = comdexModule.coin
