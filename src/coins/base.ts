import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import ethereumLogo from './coinlogos/ethereum.webp'

export const BASE_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: true, assetSend: false, activity: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
}

export function createBaseNetwork(ctx: CoinRuntimeContext): Network {
  return {
    id: 'base',
    name: 'Base',
    symbol: 'BASE',
    coinType: 'EVM',
    coinSymbol: 'ETH',
    chainId: 8453,
    rpcUrl: import.meta.env.VITE_BASE_RPC || 'https://mainnet.base.org',
    rpcWallet: '',
    rpcUsername: import.meta.env.VITE_BASE_RPC_USER || '',
    rpcPassword: import.meta.env.VITE_BASE_RPC_PASSWORD || '',
    bridgeUrl: import.meta.env.VITE_BASE_BRIDGE_URL || ctx.buildBridgeUrl('base', 'main'),
    bridgeUsername: import.meta.env.VITE_BASE_BRIDGE_USER || 'bridgeuser',
    bridgePassword: import.meta.env.VITE_BASE_BRIDGE_PASSWORD || 'bridgepass',
    explorerUrl: import.meta.env.VITE_BASE_EXPLORER || 'https://basescan.org',
    capabilities: BASE_CAPABILITIES,
    logo: ethereumLogo
  }
}

export const baseCoin: CoinModule = {
  id: 'base',
  symbol: 'BASE',
  coinSymbol: 'ETH',
  capabilities: BASE_CAPABILITIES,
  createNetwork: createBaseNetwork
}

