import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createCosmosCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const elysModule = createCosmosCoinModule({
  id: 'elys',
  name: 'Elys',
  bridgeCoinId: 'elys',
  logo: getUnifiedLogoByName('elysia'),
  rpcEnvKey: 'VITE_ELYS_RPC',
  rpcUserEnvKey: 'VITE_ELYS_RPC_USER',
  rpcPasswordEnvKey: 'VITE_ELYS_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_ELYS_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_ELYS_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_ELYS_EXPLORER',
  defaultRpcUrl: 'https://elys-rpc.publicnode.com',
  defaultExplorerUrl: 'https://www.mintscan.io/elys'
})

export const ELYS_CAPABILITIES: NetworkCapabilitiesInput = elysModule.capabilities
export const createElysNetwork: (ctx: CoinRuntimeContext) => Network = elysModule.createNetwork
export const elysCoin: CoinModule = elysModule.coin
