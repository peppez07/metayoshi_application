import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import ethLogo from './coinlogos/ethereum.webp'

export const MANTAATLANTIC_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: true, assetSend: true, activity: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
}

export function createMantaAtlanticNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--manta-atlantic',
    runtimeModelId: 'eth',
    serverCoinId: 'manta-atlantic',
    serverChain: 'main',
    name: 'Manta Atlantic',
    symbol: 'MANTAA',
    coinType: 'EVM',
    coinSymbol: 'MANTAA',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('manta-atlantic', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: MANTAATLANTIC_CAPABILITIES,
    derivation: { status: 'supported' },    logo: ethLogo
  }
}

export const mantaAtlanticCoin: CoinModule = {
  id: 'srv--manta-atlantic',
  symbol: 'MANTAA',
  coinSymbol: 'MANTAA',
  capabilities: MANTAATLANTIC_CAPABILITIES,
  createNetwork: createMantaAtlanticNetwork
}

