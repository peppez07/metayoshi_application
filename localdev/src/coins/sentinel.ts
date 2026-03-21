import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createCosmosCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const sentinelModule = createCosmosCoinModule({
  id: 'sentinel',
  name: 'Sentinel',
  bridgeCoinId: 'sentinel',
  logo: getUnifiedLogoByName('sentinel'),
  rpcEnvKey: 'VITE_SENTINEL_RPC',
  rpcUserEnvKey: 'VITE_SENTINEL_RPC_USER',
  rpcPasswordEnvKey: 'VITE_SENTINEL_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_SENTINEL_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_SENTINEL_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_SENTINEL_EXPLORER',
  defaultRpcUrl: '',
  defaultExplorerUrl: ''
})

export const SENTINEL_CAPABILITIES: NetworkCapabilitiesInput = sentinelModule.capabilities
export const createSentinelNetwork: (ctx: CoinRuntimeContext) => Network = sentinelModule.createNetwork
export const sentinelCoin: CoinModule = sentinelModule.coin
