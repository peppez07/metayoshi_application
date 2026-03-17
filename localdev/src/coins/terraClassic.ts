import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createCosmosCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const terraClassicModule = createCosmosCoinModule({
  id: 'terra-classic',
  name: 'Terra Classic',
  bridgeCoinId: 'terra-classic',
  logo: getUnifiedLogoByName('terra-classic'),
  rpcEnvKey: 'VITE_TERRA_CLASSIC_RPC',
  rpcUserEnvKey: 'VITE_TERRA_CLASSIC_RPC_USER',
  rpcPasswordEnvKey: 'VITE_TERRA_CLASSIC_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_TERRA_CLASSIC_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_TERRA_CLASSIC_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_TERRA_CLASSIC_EXPLORER',
  defaultRpcUrl: 'https://terra-classic-rpc.publicnode.com',
  defaultExplorerUrl: 'https://www.mintscan.io/terra-classic'
})

export const TERRA_CLASSIC_CAPABILITIES: NetworkCapabilitiesInput = terraClassicModule.capabilities
export const createTerraClassicNetwork: (ctx: CoinRuntimeContext) => Network = terraClassicModule.createNetwork
export const terraClassicCoin: CoinModule = terraClassicModule.coin
