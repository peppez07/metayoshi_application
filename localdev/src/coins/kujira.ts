import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createCosmosCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const kujiraModule = createCosmosCoinModule({
  id: 'kujira',
  name: 'Kujira',
  bridgeCoinId: 'kujira',
  logo: getUnifiedLogoByName('kujira'),
  rpcEnvKey: 'VITE_KUJIRA_RPC',
  rpcUserEnvKey: 'VITE_KUJIRA_RPC_USER',
  rpcPasswordEnvKey: 'VITE_KUJIRA_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_KUJIRA_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_KUJIRA_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_KUJIRA_EXPLORER',
  defaultRpcUrl: 'https://kujira-rpc.publicnode.com',
  defaultExplorerUrl: 'https://www.mintscan.io/kujira'
})

export const KUJIRA_CAPABILITIES: NetworkCapabilitiesInput = kujiraModule.capabilities
export const createKujiraNetwork: (ctx: CoinRuntimeContext) => Network = kujiraModule.createNetwork
export const kujiraCoin: CoinModule = kujiraModule.coin
