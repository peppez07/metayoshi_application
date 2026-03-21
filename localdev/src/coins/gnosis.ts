import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const gnosisModule = createEvmCoinModule({
  id: 'gnosis',
  name: 'Gnosis',
  symbol: 'XDAI',
  coinSymbol: 'XDAI',
  chainId: 100,
  bridgeCoinId: 'gnosis',
  logo: getUnifiedLogoByName('gnosis'),
  rpcEnvKey: 'VITE_GNOSIS_RPC',
  rpcUserEnvKey: 'VITE_GNOSIS_RPC_USER',
  rpcPasswordEnvKey: 'VITE_GNOSIS_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_GNOSIS_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_GNOSIS_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_GNOSIS_EXPLORER',
  defaultExplorerUrl: ''
})

export const GNOSIS_CAPABILITIES: NetworkCapabilitiesInput = gnosisModule.capabilities
export const createGnosisNetwork: (ctx: CoinRuntimeContext) => Network = gnosisModule.createNetwork
export const gnosisCoin: CoinModule = gnosisModule.coin
