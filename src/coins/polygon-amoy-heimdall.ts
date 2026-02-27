import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import polygonLogo from './coinlogos/polygon.webp'

export const POLYGONAMOYHEIMDALL_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: true, assetSend: true, activity: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
}

export function createPolygonAmoyHeimdallNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--polygon-amoy-heimdall',
    runtimeModelId: 'polygon',
    serverCoinId: 'polygon-amoy-heimdall',
    serverChain: 'main',
    name: 'Polygon Amoy Heimdall',
    symbol: 'POLYGO',
    coinType: 'EVM',
    coinSymbol: 'POLYGO',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('polygon-amoy-heimdall', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: POLYGONAMOYHEIMDALL_CAPABILITIES,
    derivation: { status: 'supported' },    logo: polygonLogo
  }
}

export const polygonAmoyHeimdallCoin: CoinModule = {
  id: 'srv--polygon-amoy-heimdall',
  symbol: 'POLYGO',
  coinSymbol: 'POLYGO',
  capabilities: POLYGONAMOYHEIMDALL_CAPABILITIES,
  createNetwork: createPolygonAmoyHeimdallNetwork
}

