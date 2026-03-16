import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const nibiruEvmModule = createEvmCoinModule({
  id: 'nibiru-evm',
  name: 'Nibiru',
  symbol: 'NIBI',
  coinSymbol: 'NIBI',
  chainId: 6900,
  bridgeCoinId: 'nibiru-evm',
  logo: getUnifiedLogoByName('nibiru'),
  rpcEnvKey: 'VITE_NIBIRU_EVM_RPC',
  rpcUserEnvKey: 'VITE_NIBIRU_EVM_RPC_USER',
  rpcPasswordEnvKey: 'VITE_NIBIRU_EVM_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_NIBIRU_EVM_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_NIBIRU_EVM_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_NIBIRU_EVM_EXPLORER',
  defaultExplorerUrl: 'https://explorer.nibiru.fi'
})

export const NIBIRU_EVM_CAPABILITIES: NetworkCapabilitiesInput = nibiruEvmModule.capabilities
export const createNibiruEvmNetwork: (ctx: CoinRuntimeContext) => Network = nibiruEvmModule.createNetwork
export const nibiruEvmCoin: CoinModule = nibiruEvmModule.coin
