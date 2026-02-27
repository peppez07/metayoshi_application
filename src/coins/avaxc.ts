import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import avalancheLogo from './coinlogos/avalanche.png'

const avaxcModule = createEvmCoinModule({
  id: 'avaxc',
  name: 'Avalanche C-Chain',
  symbol: 'AVAX',
  coinSymbol: 'AVAX',
  chainId: 43114,
  bridgeCoinId: 'avalanche-c-chain',
  logo: avalancheLogo,
  rpcEnvKey: 'VITE_AVAXC_RPC',
  rpcUserEnvKey: 'VITE_AVAXC_RPC_USER',
  rpcPasswordEnvKey: 'VITE_AVAXC_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_AVAXC_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_AVAXC_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_AVAXC_EXPLORER',
  defaultRpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
  defaultExplorerUrl: 'https://snowtrace.io'
})

export const AVAXC_CAPABILITIES: NetworkCapabilitiesInput = avaxcModule.capabilities
export const createAvaxCNetwork: (ctx: CoinRuntimeContext) => Network = avaxcModule.createNetwork
export const avaxcCoin: CoinModule = avaxcModule.coin
