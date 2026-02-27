import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import bnbLogo from './coinlogos/bnb.png'

const bnbModule = createEvmCoinModule({
  id: 'bnb',
  name: 'BNB Smart Chain',
  symbol: 'BNB',
  coinSymbol: 'BNB',
  chainId: 56,
  bridgeCoinId: 'bsc',
  logo: bnbLogo,
  rpcEnvKey: 'VITE_BNB_RPC',
  rpcUserEnvKey: 'VITE_BNB_RPC_USER',
  rpcPasswordEnvKey: 'VITE_BNB_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_BNB_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_BNB_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_BNB_EXPLORER',
  defaultRpcUrl: 'https://bsc-dataseed.binance.org',
  defaultExplorerUrl: 'https://bscscan.com'
})

export const BNB_CAPABILITIES: NetworkCapabilitiesInput = bnbModule.capabilities
export const createBnbNetwork: (ctx: CoinRuntimeContext) => Network = bnbModule.createNetwork
export const bnbCoin: CoinModule = bnbModule.coin
