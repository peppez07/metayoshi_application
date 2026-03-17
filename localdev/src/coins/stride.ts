import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createCosmosCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const strideModule = createCosmosCoinModule({
  id: 'stride',
  name: 'Stride',
  bridgeCoinId: 'stride',
  logo: getUnifiedLogoByName('stride'),
  rpcEnvKey: 'VITE_STRIDE_RPC',
  rpcUserEnvKey: 'VITE_STRIDE_RPC_USER',
  rpcPasswordEnvKey: 'VITE_STRIDE_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_STRIDE_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_STRIDE_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_STRIDE_EXPLORER',
  defaultRpcUrl: 'https://stride-rpc.publicnode.com',
  defaultExplorerUrl: 'https://www.mintscan.io/stride'
})

export const STRIDE_CAPABILITIES: NetworkCapabilitiesInput = strideModule.capabilities
export const createStrideNetwork: (ctx: CoinRuntimeContext) => Network = strideModule.createNetwork
export const strideCoin: CoinModule = strideModule.coin
