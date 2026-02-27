import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import polygonLogo from './coinlogos/polygon.webp'

export const POLYGONAMOYBOR_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: true, assetSend: true, activity: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
}

export function createPolygonAmoyBorNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--polygon-amoy-bor',
    runtimeModelId: 'polygon',
    serverCoinId: 'polygon-amoy-bor',
    serverChain: 'main',
    name: 'Polygon Amoy Bor',
    symbol: 'POLYGO',
    coinType: 'EVM',
    coinSymbol: 'POLYGO',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('polygon-amoy-bor', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: POLYGONAMOYBOR_CAPABILITIES,
    derivation: { status: 'supported' },    logo: polygonLogo
  }
}

export const polygonAmoyBorCoin: CoinModule = {
  id: 'srv--polygon-amoy-bor',
  symbol: 'POLYGO',
  coinSymbol: 'POLYGO',
  capabilities: POLYGONAMOYBOR_CAPABILITIES,
  createNetwork: createPolygonAmoyBorNetwork
}

