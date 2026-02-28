import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import baseLogo from './coinlogos/base.png'

const baseModule = createEvmCoinModule({
  id: 'base',
  name: 'Base',
  symbol: 'BASE',
  coinSymbol: 'ETH',
  chainId: 8453,
  bridgeCoinId: 'base',
  logo: baseLogo,
  rpcEnvKey: 'VITE_BASE_RPC',
  rpcUserEnvKey: 'VITE_BASE_RPC_USER',
  rpcPasswordEnvKey: 'VITE_BASE_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_BASE_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_BASE_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_BASE_EXPLORER',
  defaultRpcUrl: 'https://mainnet.base.org',
  defaultExplorerUrl: 'https://basescan.org'
})

export const BASE_CAPABILITIES: NetworkCapabilitiesInput = baseModule.capabilities
export const createBaseNetwork: (ctx: CoinRuntimeContext) => Network = baseModule.createNetwork
export const baseCoin: CoinModule = baseModule.coin
