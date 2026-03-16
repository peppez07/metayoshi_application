import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const haqqModule = createEvmCoinModule({
  id: 'haqq',
  name: 'HAQQ',
  symbol: 'ISLM',
  coinSymbol: 'ISLM',
  chainId: 11235,
  bridgeCoinId: 'haqq',
  logo: getUnifiedLogoByName('haqq'),
  rpcEnvKey: 'VITE_HAQQ_RPC',
  rpcUserEnvKey: 'VITE_HAQQ_RPC_USER',
  rpcPasswordEnvKey: 'VITE_HAQQ_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_HAQQ_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_HAQQ_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_HAQQ_EXPLORER',
  defaultExplorerUrl: 'https://explorer.haqq.network'
})

export const HAQQ_CAPABILITIES: NetworkCapabilitiesInput = haqqModule.capabilities
export const createHaqqNetwork: (ctx: CoinRuntimeContext) => Network = haqqModule.createNetwork
export const haqqCoin: CoinModule = haqqModule.coin
