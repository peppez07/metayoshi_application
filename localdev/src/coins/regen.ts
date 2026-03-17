import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createCosmosCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const regenModule = createCosmosCoinModule({
  id: 'regen',
  name: 'Regen',
  bridgeCoinId: 'regen',
  logo: getUnifiedLogoByName('regen'),
  rpcEnvKey: 'VITE_REGEN_RPC',
  rpcUserEnvKey: 'VITE_REGEN_RPC_USER',
  rpcPasswordEnvKey: 'VITE_REGEN_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_REGEN_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_REGEN_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_REGEN_EXPLORER',
  defaultRpcUrl: 'https://regen-rpc.publicnode.com',
  defaultExplorerUrl: 'https://www.mintscan.io/regen'
})

export const REGEN_CAPABILITIES: NetworkCapabilitiesInput = regenModule.capabilities
export const createRegenNetwork: (ctx: CoinRuntimeContext) => Network = regenModule.createNetwork
export const regenCoin: CoinModule = regenModule.coin
