import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createCosmosCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const osmosisModule = createCosmosCoinModule({
  id: 'osmosis',
  name: 'Osmosis',
  bridgeCoinId: 'osmosis',
  logo: getUnifiedLogoByName('osmosis'),
  rpcEnvKey: 'VITE_OSMOSIS_RPC',
  rpcUserEnvKey: 'VITE_OSMOSIS_RPC_USER',
  rpcPasswordEnvKey: 'VITE_OSMOSIS_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_OSMOSIS_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_OSMOSIS_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_OSMOSIS_EXPLORER',
  defaultRpcUrl: 'https://osmosis-rpc.publicnode.com',
  defaultExplorerUrl: 'https://www.mintscan.io/osmosis'
})

export const OSMOSIS_CAPABILITIES: NetworkCapabilitiesInput = osmosisModule.capabilities
export const createOsmosisNetwork: (ctx: CoinRuntimeContext) => Network = osmosisModule.createNetwork
export const osmosisCoin: CoinModule = osmosisModule.coin
