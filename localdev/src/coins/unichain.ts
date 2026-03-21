import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const unichainModule = createEvmCoinModule({
  id: 'unichain',
  name: 'Unichain',
  symbol: 'ETH',
  coinSymbol: 'ETH',
  chainId: 130,
  bridgeCoinId: 'unichain',
  logo: getUnifiedLogoByName('unichain'),
  rpcEnvKey: 'VITE_UNICHAIN_RPC',
  rpcUserEnvKey: 'VITE_UNICHAIN_RPC_USER',
  rpcPasswordEnvKey: 'VITE_UNICHAIN_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_UNICHAIN_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_UNICHAIN_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_UNICHAIN_EXPLORER',
  defaultExplorerUrl: ''
})

export const UNICHAIN_CAPABILITIES: NetworkCapabilitiesInput = unichainModule.capabilities
export const createUnichainNetwork: (ctx: CoinRuntimeContext) => Network = unichainModule.createNetwork
export const unichainCoin: CoinModule = unichainModule.coin
