import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const xplaEvmModule = createEvmCoinModule({
  id: 'xpla-evm',
  name: 'XPLA',
  symbol: 'XPLA',
  coinSymbol: 'XPLA',
  chainId: 37,
  bridgeCoinId: 'xpla-evm',
  logo: getUnifiedLogoByName('xpla'),
  rpcEnvKey: 'VITE_XPLA_EVM_RPC',
  rpcUserEnvKey: 'VITE_XPLA_EVM_RPC_USER',
  rpcPasswordEnvKey: 'VITE_XPLA_EVM_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_XPLA_EVM_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_XPLA_EVM_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_XPLA_EVM_EXPLORER',
  defaultExplorerUrl: 'https://evm.xpla.io'
})

export const XPLA_EVM_CAPABILITIES: NetworkCapabilitiesInput = xplaEvmModule.capabilities
export const createXplaEvmNetwork: (ctx: CoinRuntimeContext) => Network = xplaEvmModule.createNetwork
export const xplaEvmCoin: CoinModule = xplaEvmModule.coin
