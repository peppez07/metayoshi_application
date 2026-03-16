import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const fraxtalModule = createEvmCoinModule({
  id: 'fraxtal',
  name: 'Fraxtal',
  symbol: 'frxETH',
  coinSymbol: 'frxETH',
  chainId: 252,
  bridgeCoinId: 'fraxtal',
  logo: getUnifiedLogoByName('fraxtal'),
  rpcEnvKey: 'VITE_FRAXTAL_RPC',
  rpcUserEnvKey: 'VITE_FRAXTAL_RPC_USER',
  rpcPasswordEnvKey: 'VITE_FRAXTAL_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_FRAXTAL_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_FRAXTAL_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_FRAXTAL_EXPLORER',
  defaultExplorerUrl: 'https://fraxscan.com'
})

export const FRAXTAL_CAPABILITIES: NetworkCapabilitiesInput = fraxtalModule.capabilities
export const createFraxtalNetwork: (ctx: CoinRuntimeContext) => Network = fraxtalModule.createNetwork
export const fraxtalCoin: CoinModule = fraxtalModule.coin
