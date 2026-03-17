import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createCosmosCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const injectiveModule = createCosmosCoinModule({
  id: 'injective',
  name: 'Injective',
  bridgeCoinId: 'injective',
  logo: getUnifiedLogoByName('injective'),
  rpcEnvKey: 'VITE_INJECTIVE_RPC',
  rpcUserEnvKey: 'VITE_INJECTIVE_RPC_USER',
  rpcPasswordEnvKey: 'VITE_INJECTIVE_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_INJECTIVE_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_INJECTIVE_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_INJECTIVE_EXPLORER',
  defaultRpcUrl: 'https://injective-rpc.publicnode.com',
  defaultExplorerUrl: 'https://www.mintscan.io/injective'
})

export const INJECTIVE_CAPABILITIES: NetworkCapabilitiesInput = injectiveModule.capabilities
export const createInjectiveNetwork: (ctx: CoinRuntimeContext) => Network = injectiveModule.createNetwork
export const injectiveCoin: CoinModule = injectiveModule.coin
