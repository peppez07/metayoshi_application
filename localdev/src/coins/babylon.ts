import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createCosmosCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const babylonModule = createCosmosCoinModule({
  id: 'babylon',
  name: 'Babylon',
  bridgeCoinId: 'babylon',
  logo: getUnifiedLogoByName('babylon'),
  rpcEnvKey: 'VITE_BABYLON_RPC',
  rpcUserEnvKey: 'VITE_BABYLON_RPC_USER',
  rpcPasswordEnvKey: 'VITE_BABYLON_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_BABYLON_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_BABYLON_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_BABYLON_EXPLORER',
  defaultRpcUrl: '',
  defaultExplorerUrl: ''
})

export const BABYLON_CAPABILITIES: NetworkCapabilitiesInput = babylonModule.capabilities
export const createBabylonNetwork: (ctx: CoinRuntimeContext) => Network = babylonModule.createNetwork
export const babylonCoin: CoinModule = babylonModule.coin
