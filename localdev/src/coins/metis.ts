import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const metisModule = createEvmCoinModule({
  id: 'metis',
  name: 'Metis',
  symbol: 'METIS',
  coinSymbol: 'METIS',
  chainId: 1088,
  bridgeCoinId: 'metis',
  logo: getUnifiedLogoByName('metis'),
  rpcEnvKey: 'VITE_METIS_RPC',
  rpcUserEnvKey: 'VITE_METIS_RPC_USER',
  rpcPasswordEnvKey: 'VITE_METIS_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_METIS_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_METIS_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_METIS_EXPLORER',
  defaultExplorerUrl: 'https://explorer.metis.io'
})

export const METIS_CAPABILITIES: NetworkCapabilitiesInput = metisModule.capabilities
export const createMetisNetwork: (ctx: CoinRuntimeContext) => Network = metisModule.createNetwork
export const metisCoin: CoinModule = metisModule.coin
