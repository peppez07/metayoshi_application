import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { createEvmCoinModule } from './factories'
import { getUnifiedLogoByName } from './logos'

const polygonAmoyModule = createEvmCoinModule({
  id: 'polygon-amoy',
  runtimeModelId: 'polygon',
  name: 'Polygon Amoy',
  symbol: 'POL',
  coinSymbol: 'POL',
  chainId: 80002,
  bridgeCoinId: 'polygon-amoy-bor',
  bridgeChain: 'main',
  logo: getUnifiedLogoByName('polygon'),
  rpcEnvKey: 'VITE_POLYGON_AMOY_RPC',
  rpcUserEnvKey: 'VITE_POLYGON_AMOY_RPC_USER',
  rpcPasswordEnvKey: 'VITE_POLYGON_AMOY_RPC_PASSWORD',
  bridgeUserEnvKey: 'VITE_POLYGON_AMOY_BRIDGE_USER',
  bridgePasswordEnvKey: 'VITE_POLYGON_AMOY_BRIDGE_PASSWORD',
  explorerEnvKey: 'VITE_POLYGON_AMOY_EXPLORER',
  defaultExplorerUrl: 'https://amoy.polygonscan.com'
})

export const POLYGON_AMOY_CAPABILITIES: NetworkCapabilitiesInput = polygonAmoyModule.capabilities
export const createPolygonAmoyNetwork: (ctx: CoinRuntimeContext) => Network = polygonAmoyModule.createNetwork
export const polygonAmoyCoin: CoinModule = polygonAmoyModule.coin
