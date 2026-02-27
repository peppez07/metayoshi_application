import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import baseLogo from './coinlogos/base.png'

export const BASESEPOLIA_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: true, assetSend: true, activity: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
}

export function createBaseSepoliaNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--base-sepolia',
    runtimeModelId: 'base',
    serverCoinId: 'base-sepolia',
    serverChain: 'main',
    name: 'Base Sepolia',
    symbol: 'BASESE',
    coinType: 'EVM',
    coinSymbol: 'BASESE',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('base-sepolia', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: BASESEPOLIA_CAPABILITIES,
    derivation: { status: 'supported' },    logo: baseLogo
  }
}

export const baseSepoliaCoin: CoinModule = {
  id: 'srv--base-sepolia',
  symbol: 'BASESE',
  coinSymbol: 'BASESE',
  capabilities: BASESEPOLIA_CAPABILITIES,
  createNetwork: createBaseSepoliaNetwork
}

