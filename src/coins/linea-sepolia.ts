import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import ethLogo from './coinlogos/ethereum.webp'

export const LINEASEPOLIA_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: true, assetSend: true, activity: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
}

export function createLineaSepoliaNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--linea-sepolia',
    runtimeModelId: 'eth',
    serverCoinId: 'linea-sepolia',
    serverChain: 'main',
    name: 'Linea Sepolia',
    symbol: 'LINEAS',
    coinType: 'EVM',
    coinSymbol: 'LINEAS',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('linea-sepolia', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: LINEASEPOLIA_CAPABILITIES,
    derivation: { status: 'supported' },    logo: ethLogo
  }
}

export const lineaSepoliaCoin: CoinModule = {
  id: 'srv--linea-sepolia',
  symbol: 'LINEAS',
  coinSymbol: 'LINEAS',
  capabilities: LINEASEPOLIA_CAPABILITIES,
  createNetwork: createLineaSepoliaNetwork
}

