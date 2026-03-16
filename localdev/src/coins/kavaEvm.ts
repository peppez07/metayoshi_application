import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const kavaEvmModule = createEvmCoinModule({
  id: 'kava-evm',
  name: 'Kava',
  symbol: 'KAVA',
  coinSymbol: 'KAVA',
  chainId: 2222,
  bridgeCoinId: 'kava-evm',
  logo: getUnifiedLogoByName('kava'),
  rpcEnvKey: 'VITE_KAVA_EVM_RPC',
  rpcUserEnvKey: 'VITE_KAVA_EVM_RPC_USER',
  rpcPasswordEnvKey: 'VITE_KAVA_EVM_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_KAVA_EVM_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_KAVA_EVM_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_KAVA_EVM_EXPLORER',
  defaultExplorerUrl: 'https://kavascan.com'
})

export const KAVA_EVM_CAPABILITIES: NetworkCapabilitiesInput = kavaEvmModule.capabilities
export const createKavaEvmNetwork: (ctx: CoinRuntimeContext) => Network = kavaEvmModule.createNetwork
export const kavaEvmCoin: CoinModule = kavaEvmModule.coin
