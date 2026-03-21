import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const lineaModule = createEvmCoinModule({
  id: 'linea',
  name: 'Linea',
  symbol: 'ETH',
  coinSymbol: 'ETH',
  chainId: 59144,
  bridgeCoinId: 'linea',
  logo: getUnifiedLogoByName('linea'),
  rpcEnvKey: 'VITE_LINEA_RPC',
  rpcUserEnvKey: 'VITE_LINEA_RPC_USER',
  rpcPasswordEnvKey: 'VITE_LINEA_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_LINEA_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_LINEA_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_LINEA_EXPLORER',
  defaultExplorerUrl: ''
})

export const LINEA_CAPABILITIES: NetworkCapabilitiesInput = lineaModule.capabilities
export const createLineaNetwork: (ctx: CoinRuntimeContext) => Network = lineaModule.createNetwork
export const lineaCoin: CoinModule = lineaModule.coin
