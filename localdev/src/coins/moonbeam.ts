import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const moonbeamModule = createEvmCoinModule({
  id: 'moonbeam',
  name: 'Moonbeam',
  symbol: 'GLMR',
  coinSymbol: 'GLMR',
  chainId: 1284,
  bridgeCoinId: 'moonbeam',
  logo: getUnifiedLogoByName('moonbeam'),
  rpcEnvKey: 'VITE_MOONBEAM_RPC',
  rpcUserEnvKey: 'VITE_MOONBEAM_RPC_USER',
  rpcPasswordEnvKey: 'VITE_MOONBEAM_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_MOONBEAM_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_MOONBEAM_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_MOONBEAM_EXPLORER',
  defaultExplorerUrl: 'https://moonscan.io'
})

export const MOONBEAM_CAPABILITIES: NetworkCapabilitiesInput = moonbeamModule.capabilities
export const createMoonbeamNetwork: (ctx: CoinRuntimeContext) => Network = moonbeamModule.createNetwork
export const moonbeamCoin: CoinModule = moonbeamModule.coin
