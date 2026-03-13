import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const bahamutModule = createEvmCoinModule({
  id: 'bahamut',
  name: 'Bahamut',
  symbol: 'FTN',
  coinSymbol: 'FTN',
  chainId: 5165,
  bridgeCoinId: 'bahamut',
  logo: getUnifiedLogoByName('bahamut'),
  rpcEnvKey: 'VITE_BAHAMUT_RPC',
  rpcUserEnvKey: 'VITE_BAHAMUT_RPC_USER',
  rpcPasswordEnvKey: 'VITE_BAHAMUT_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_BAHAMUT_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_BAHAMUT_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_BAHAMUT_EXPLORER',
  defaultExplorerUrl: 'https://ftnscan.com'
})

export const BAHAMUT_CAPABILITIES: NetworkCapabilitiesInput = bahamutModule.capabilities
export const createBahamutNetwork: (ctx: CoinRuntimeContext) => Network = bahamutModule.createNetwork
export const bahamutCoin: CoinModule = bahamutModule.coin
