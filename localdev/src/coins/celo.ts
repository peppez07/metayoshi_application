import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const celoModule = createEvmCoinModule({
  id: 'celo',
  name: 'Celo',
  symbol: 'CELO',
  coinSymbol: 'CELO',
  chainId: 42220,
  bridgeCoinId: 'celo',
  logo: getUnifiedLogoByName('celo'),
  rpcEnvKey: 'VITE_CELO_RPC',
  rpcUserEnvKey: 'VITE_CELO_RPC_USER',
  rpcPasswordEnvKey: 'VITE_CELO_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_CELO_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_CELO_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_CELO_EXPLORER',
  defaultExplorerUrl: ''
})

export const CELO_CAPABILITIES: NetworkCapabilitiesInput = celoModule.capabilities
export const createCeloNetwork: (ctx: CoinRuntimeContext) => Network = celoModule.createNetwork
export const celoCoin: CoinModule = celoModule.coin
