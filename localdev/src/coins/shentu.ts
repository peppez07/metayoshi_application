import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createCosmosCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const shentuModule = createCosmosCoinModule({
  id: 'shentu',
  name: 'Shentu',
  bridgeCoinId: 'shentu',
  logo: getUnifiedLogoByName('shentu'),
  rpcEnvKey: 'VITE_SHENTU_RPC',
  rpcUserEnvKey: 'VITE_SHENTU_RPC_USER',
  rpcPasswordEnvKey: 'VITE_SHENTU_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_SHENTU_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_SHENTU_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_SHENTU_EXPLORER',
  defaultRpcUrl: 'https://shentu-rpc.publicnode.com',
  defaultExplorerUrl: 'https://www.mintscan.io/shentu'
})

export const SHENTU_CAPABILITIES: NetworkCapabilitiesInput = shentuModule.capabilities
export const createShentuNetwork: (ctx: CoinRuntimeContext) => Network = shentuModule.createNetwork
export const shentuCoin: CoinModule = shentuModule.coin
