import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const evmosEvmModule = createEvmCoinModule({
  id: 'evmos-evm',
  name: 'Evmos',
  symbol: 'EVMOS',
  coinSymbol: 'EVMOS',
  chainId: 9001,
  bridgeCoinId: 'evmos-evm',
  logo: getUnifiedLogoByName('evmos'),
  rpcEnvKey: 'VITE_EVMOS_EVM_RPC',
  rpcUserEnvKey: 'VITE_EVMOS_EVM_RPC_USER',
  rpcPasswordEnvKey: 'VITE_EVMOS_EVM_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_EVMOS_EVM_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_EVMOS_EVM_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_EVMOS_EVM_EXPLORER',
  defaultExplorerUrl: ''
})

export const EVMOS_EVM_CAPABILITIES: NetworkCapabilitiesInput = evmosEvmModule.capabilities
export const createEvmosEvmNetwork: (ctx: CoinRuntimeContext) => Network = evmosEvmModule.createNetwork
export const evmosEvmCoin: CoinModule = evmosEvmModule.coin
