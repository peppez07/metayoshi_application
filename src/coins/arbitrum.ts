import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import arbitrumLogo from './coinlogos/arbitrum.png'

const arbitrumModule = createEvmCoinModule({
  id: 'arb',
  name: 'Arbitrum One',
  symbol: 'ARB',
  coinSymbol: 'ETH',
  chainId: 42161,
  bridgeCoinId: 'arbitrum-one',
  logo: arbitrumLogo,
  rpcEnvKey: 'VITE_ARB_RPC',
  rpcUserEnvKey: 'VITE_ARB_RPC_USER',
  rpcPasswordEnvKey: 'VITE_ARB_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_ARB_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_ARB_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_ARB_EXPLORER',
  defaultRpcUrl: 'https://arb1.arbitrum.io/rpc',
  defaultExplorerUrl: 'https://arbiscan.io'
})

export const ARBITRUM_CAPABILITIES: NetworkCapabilitiesInput = arbitrumModule.capabilities
export const createArbitrumNetwork: (ctx: CoinRuntimeContext) => Network = arbitrumModule.createNetwork
export const arbitrumCoin: CoinModule = arbitrumModule.coin
