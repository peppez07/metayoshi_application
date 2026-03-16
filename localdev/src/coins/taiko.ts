import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const taikoModule = createEvmCoinModule({
  id: 'taiko',
  name: 'Taiko',
  symbol: 'ETH',
  coinSymbol: 'ETH',
  chainId: 167000,
  bridgeCoinId: 'taiko',
  logo: getUnifiedLogoByName('taiko'),
  rpcEnvKey: 'VITE_TAIKO_RPC',
  rpcUserEnvKey: 'VITE_TAIKO_RPC_USER',
  rpcPasswordEnvKey: 'VITE_TAIKO_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_TAIKO_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_TAIKO_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_TAIKO_EXPLORER',
  defaultExplorerUrl: 'https://taikoscan.io'
})

export const TAIKO_CAPABILITIES: NetworkCapabilitiesInput = taikoModule.capabilities
export const createTaikoNetwork: (ctx: CoinRuntimeContext) => Network = taikoModule.createNetwork
export const taikoCoin: CoinModule = taikoModule.coin
