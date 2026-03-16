import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const scrollModule = createEvmCoinModule({
  id: 'scroll',
  name: 'Scroll',
  symbol: 'ETH',
  coinSymbol: 'ETH',
  chainId: 534352,
  bridgeCoinId: 'scroll',
  logo: getUnifiedLogoByName('scroll'),
  rpcEnvKey: 'VITE_SCROLL_RPC',
  rpcUserEnvKey: 'VITE_SCROLL_RPC_USER',
  rpcPasswordEnvKey: 'VITE_SCROLL_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_SCROLL_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_SCROLL_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_SCROLL_EXPLORER',
  defaultExplorerUrl: 'https://scrollscan.com'
})

export const SCROLL_CAPABILITIES: NetworkCapabilitiesInput = scrollModule.capabilities
export const createScrollNetwork: (ctx: CoinRuntimeContext) => Network = scrollModule.createNetwork
export const scrollCoin: CoinModule = scrollModule.coin
