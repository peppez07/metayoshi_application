import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const pulsechainModule = createEvmCoinModule({
  id: 'pulsechain',
  name: 'PulseChain',
  symbol: 'PLS',
  coinSymbol: 'PLS',
  chainId: 369,
  bridgeCoinId: 'pulsechain',
  logo: getUnifiedLogoByName('pulsechain'),
  rpcEnvKey: 'VITE_PULSECHAIN_RPC',
  rpcUserEnvKey: 'VITE_PULSECHAIN_RPC_USER',
  rpcPasswordEnvKey: 'VITE_PULSECHAIN_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_PULSECHAIN_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_PULSECHAIN_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_PULSECHAIN_EXPLORER',
  defaultExplorerUrl: ''
})

export const PULSECHAIN_CAPABILITIES: NetworkCapabilitiesInput = pulsechainModule.capabilities
export const createPulsechainNetwork: (ctx: CoinRuntimeContext) => Network = pulsechainModule.createNetwork
export const pulsechainCoin: CoinModule = pulsechainModule.coin
