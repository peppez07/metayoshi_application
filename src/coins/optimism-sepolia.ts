import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import baseLogo from './coinlogos/base.png'

export const OPTIMISMSEPOLIA_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: true, assetSend: true, activity: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
}

export function createOptimismSepoliaNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--optimism-sepolia',
    runtimeModelId: 'base',
    serverCoinId: 'optimism-sepolia',
    serverChain: 'main',
    name: 'Optimism Sepolia',
    symbol: 'OPTIMI',
    coinType: 'EVM',
    coinSymbol: 'OPTIMI',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('optimism-sepolia', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: OPTIMISMSEPOLIA_CAPABILITIES,
    derivation: { status: 'supported' },    logo: baseLogo
  }
}

export const optimismSepoliaCoin: CoinModule = {
  id: 'srv--optimism-sepolia',
  symbol: 'OPTIMI',
  coinSymbol: 'OPTIMI',
  capabilities: OPTIMISMSEPOLIA_CAPABILITIES,
  createNetwork: createOptimismSepoliaNetwork
}

