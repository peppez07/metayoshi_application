import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import ethLogo from './coinlogos/ethereum.webp'

export const METISSEPOLIA_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: true, assetSend: true, activity: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
}

export function createMetisSepoliaNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--metis-sepolia',
    runtimeModelId: 'eth',
    serverCoinId: 'metis-sepolia',
    serverChain: 'main',
    name: 'Metis Sepolia',
    symbol: 'METISS',
    coinType: 'EVM',
    coinSymbol: 'METISS',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('metis-sepolia', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: METISSEPOLIA_CAPABILITIES,
    derivation: { status: 'supported' },    logo: ethLogo
  }
}

export const metisSepoliaCoin: CoinModule = {
  id: 'srv--metis-sepolia',
  symbol: 'METISS',
  coinSymbol: 'METISS',
  capabilities: METISSEPOLIA_CAPABILITIES,
  createNetwork: createMetisSepoliaNetwork
}

