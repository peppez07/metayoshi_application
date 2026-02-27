import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import ethLogo from './coinlogos/ethereum.webp'

export const SCROLLSEPOLIA_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: true, assetSend: true, activity: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
}

export function createScrollSepoliaNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--scroll-sepolia',
    runtimeModelId: 'eth',
    serverCoinId: 'scroll-sepolia',
    serverChain: 'main',
    name: 'Scroll Sepolia',
    symbol: 'SCROLL',
    coinType: 'EVM',
    coinSymbol: 'SCROLL',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('scroll-sepolia', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: SCROLLSEPOLIA_CAPABILITIES,
    derivation: { status: 'supported' },    logo: ethLogo
  }
}

export const scrollSepoliaCoin: CoinModule = {
  id: 'srv--scroll-sepolia',
  symbol: 'SCROLL',
  coinSymbol: 'SCROLL',
  capabilities: SCROLLSEPOLIA_CAPABILITIES,
  createNetwork: createScrollSepoliaNetwork
}

