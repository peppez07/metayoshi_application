import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createCosmosCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const croModule = createCosmosCoinModule({
  id: 'cro',
  name: 'Cronos POS',
  symbol: 'CRO',
  coinSymbol: 'CRO',
  bridgeCoinId: 'cronos-pos',
  logo: getUnifiedLogoByName('cronos'),
  rpcEnvKey: 'VITE_CRO_RPC',
  rpcUserEnvKey: 'VITE_CRO_RPC_USER',
  rpcPasswordEnvKey: 'VITE_CRO_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_CRO_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_CRO_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_CRO_EXPLORER',
  defaultRpcUrl: '',
  defaultExplorerUrl: ''
})

export const CRO_CAPABILITIES: NetworkCapabilitiesInput = croModule.capabilities
export const createCroNetwork: (ctx: CoinRuntimeContext) => Network = croModule.createNetwork
export const croCoin: CoinModule = croModule.coin
