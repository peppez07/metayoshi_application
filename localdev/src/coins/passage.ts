import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createCosmosCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const passageModule = createCosmosCoinModule({
  id: 'passage',
  name: 'Passage',
  bridgeCoinId: 'passage',
  logo: getUnifiedLogoByName('passage'),
  rpcEnvKey: 'VITE_PASSAGE_RPC',
  rpcUserEnvKey: 'VITE_PASSAGE_RPC_USER',
  rpcPasswordEnvKey: 'VITE_PASSAGE_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_PASSAGE_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_PASSAGE_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_PASSAGE_EXPLORER',
  defaultRpcUrl: 'https://passage-rpc.publicnode.com',
  defaultExplorerUrl: 'https://www.mintscan.io/passage'
})

export const PASSAGE_CAPABILITIES: NetworkCapabilitiesInput = passageModule.capabilities
export const createPassageNetwork: (ctx: CoinRuntimeContext) => Network = passageModule.createNetwork
export const passageCoin: CoinModule = passageModule.coin
