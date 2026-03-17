import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createCosmosCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const dydxModule = createCosmosCoinModule({
  id: 'dydx',
  name: 'dYdX',
  bridgeCoinId: 'dydx',
  logo: getUnifiedLogoByName('dydx-chain'),
  rpcEnvKey: 'VITE_DYDX_RPC',
  rpcUserEnvKey: 'VITE_DYDX_RPC_USER',
  rpcPasswordEnvKey: 'VITE_DYDX_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_DYDX_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_DYDX_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_DYDX_EXPLORER',
  defaultRpcUrl: 'https://dydx-rpc.publicnode.com',
  defaultExplorerUrl: 'https://www.mintscan.io/dydx'
})

export const DYDX_CAPABILITIES: NetworkCapabilitiesInput = dydxModule.capabilities
export const createDydxNetwork: (ctx: CoinRuntimeContext) => Network = dydxModule.createNetwork
export const dydxCoin: CoinModule = dydxModule.coin
