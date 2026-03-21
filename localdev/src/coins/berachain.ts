import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const berachainModule = createEvmCoinModule({
  id: 'berachain',
  name: 'Berachain',
  symbol: 'BERA',
  coinSymbol: 'BERA',
  chainId: 80094,
  bridgeCoinId: 'berachain',
  logo: getUnifiedLogoByName('berachain'),
  rpcEnvKey: 'VITE_BERACHAIN_RPC',
  rpcUserEnvKey: 'VITE_BERACHAIN_RPC_USER',
  rpcPasswordEnvKey: 'VITE_BERACHAIN_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_BERACHAIN_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_BERACHAIN_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_BERACHAIN_EXPLORER',
  defaultExplorerUrl: ''
})

export const BERACHAIN_CAPABILITIES: NetworkCapabilitiesInput = berachainModule.capabilities
export const createBerachainNetwork: (ctx: CoinRuntimeContext) => Network = berachainModule.createNetwork
export const berachainCoin: CoinModule = berachainModule.coin
