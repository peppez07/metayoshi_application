import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const irisEvmModule = createEvmCoinModule({
  id: 'iris-evm',
  name: 'Iris',
  symbol: 'IRIS',
  coinSymbol: 'IRIS',
  chainId: 6688,
  bridgeCoinId: 'iris-evm',
  logo: getUnifiedLogoByName('iris'),
  rpcEnvKey: 'VITE_IRIS_EVM_RPC',
  rpcUserEnvKey: 'VITE_IRIS_EVM_RPC_USER',
  rpcPasswordEnvKey: 'VITE_IRIS_EVM_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_IRIS_EVM_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_IRIS_EVM_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_IRIS_EVM_EXPLORER',
  defaultExplorerUrl: 'https://explorer.irisnet.org'
})

export const IRIS_EVM_CAPABILITIES: NetworkCapabilitiesInput = irisEvmModule.capabilities
export const createIrisEvmNetwork: (ctx: CoinRuntimeContext) => Network = irisEvmModule.createNetwork
export const irisEvmCoin: CoinModule = irisEvmModule.coin
