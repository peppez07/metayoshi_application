import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import polygonLogo from './coinlogos/polygon.png'

export const POLYGON_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: true, assetSend: true, activity: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
}

export function createPolygonNetwork(ctx: CoinRuntimeContext): Network {
  return {
    id: 'polygon',
    name: 'Polygon',
    symbol: 'MATIC',
    coinType: 'EVM',
    coinSymbol: 'MATIC',
    chainId: 137,
    rpcUrl: import.meta.env.VITE_POLYGON_RPC || 'https://polygon-bor-rpc.publicnode.com',
    rpcWallet: '',
    rpcUsername: import.meta.env.VITE_POLYGON_RPC_USER || '',
    rpcPassword: import.meta.env.VITE_POLYGON_RPC_PASSWORD || '',
    bridgeUrl: ctx.buildBridgeUrl('polygon-bor', 'main'),
    bridgeUsername: import.meta.env.VITE_POLYGON_BRIDGE_USER || 'bridgeuser',
    bridgePassword: import.meta.env.VITE_POLYGON_BRIDGE_PASSWORD || 'bridgepass',
    explorerUrl: import.meta.env.VITE_POLYGON_EXPLORER || 'https://polygonscan.com',
    capabilities: POLYGON_CAPABILITIES,
    logo: polygonLogo
  }
}

export const polygonCoin: CoinModule = {
  id: 'polygon',
  symbol: 'MATIC',
  coinSymbol: 'MATIC',
  capabilities: POLYGON_CAPABILITIES,
  createNetwork: createPolygonNetwork
}
