import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createCosmosCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const axelarModule = createCosmosCoinModule({
  id: 'axelar',
  name: 'Axelar',
  bridgeCoinId: 'axelar',
  logo: getUnifiedLogoByName('axelar'),
  rpcEnvKey: 'VITE_AXELAR_RPC',
  rpcUserEnvKey: 'VITE_AXELAR_RPC_USER',
  rpcPasswordEnvKey: 'VITE_AXELAR_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_AXELAR_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_AXELAR_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_AXELAR_EXPLORER',
  defaultRpcUrl: '',
  defaultExplorerUrl: ''
})

export const AXELAR_CAPABILITIES: NetworkCapabilitiesInput = axelarModule.capabilities
export const createAxelarNetwork: (ctx: CoinRuntimeContext) => Network = axelarModule.createNetwork
export const axelarCoin: CoinModule = axelarModule.coin
