import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const avalancheFujiModule = createEvmCoinModule({
  id: 'avalanche-fuji',
  runtimeModelId: 'avaxc',
  name: 'Avalanche Fuji',
  symbol: 'AVAX',
  coinSymbol: 'AVAX',
  chainId: 43113,
  bridgeCoinId: 'avalanche-fuji-c-chain',
  bridgeChain: 'main',
  logo: getUnifiedLogoByName('avalanche'),
  rpcEnvKey: 'VITE_AVALANCHE_FUJI_RPC',
  rpcUserEnvKey: 'VITE_AVALANCHE_FUJI_RPC_USER',
  rpcPasswordEnvKey: 'VITE_AVALANCHE_FUJI_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_AVALANCHE_FUJI_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_AVALANCHE_FUJI_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_AVALANCHE_FUJI_EXPLORER',
  defaultExplorerUrl: 'https://testnet.snowtrace.io'
})

export const AVALANCHE_FUJI_CAPABILITIES: NetworkCapabilitiesInput = avalancheFujiModule.capabilities
export const createAvalancheFujiNetwork: (ctx: CoinRuntimeContext) => Network = avalancheFujiModule.createNetwork
export const avalancheFujiCoin: CoinModule = avalancheFujiModule.coin
