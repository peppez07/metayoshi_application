import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'

export const SOL_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createSolNetwork(ctx: CoinRuntimeContext): Network {
  return {
    id: 'sol',
    name: 'Solana',
    symbol: 'SOL',
    coinType: 'SOL',
    coinSymbol: 'SOL',
    rpcUrl: import.meta.env.VITE_SOL_RPC || 'https://api.mainnet-beta.solana.com',
    rpcWallet: '',
    rpcUsername: import.meta.env.VITE_SOL_RPC_USER || '',
    rpcPassword: import.meta.env.VITE_SOL_RPC_PASSWORD || '',
    bridgeUrl: import.meta.env.VITE_SOL_BRIDGE_URL || ctx.buildBridgeUrl('solana', 'main'),
    bridgeUsername: import.meta.env.VITE_SOL_BRIDGE_USER || 'bridgeuser',
    bridgePassword: import.meta.env.VITE_SOL_BRIDGE_PASSWORD || 'bridgepass',
    explorerUrl: import.meta.env.VITE_SOL_EXPLORER || 'https://solscan.io',
    capabilities: SOL_CAPABILITIES,
    derivation: { status: 'supported' }
  }
}

export const solCoin: CoinModule = {
  id: 'sol',
  symbol: 'SOL',
  coinSymbol: 'SOL',
  capabilities: SOL_CAPABILITIES,
  createNetwork: createSolNetwork
}
