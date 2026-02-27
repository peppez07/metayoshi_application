import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import solanaLogo from './coinlogos/solana.png'

export const SOL_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: true, assetSend: true, activity: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
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
    bridgeUrl: ctx.buildBridgeUrl('solana', 'main'),
    bridgeUsername: import.meta.env.VITE_SOL_BRIDGE_USER || 'bridgeuser',
    bridgePassword: import.meta.env.VITE_SOL_BRIDGE_PASSWORD || 'bridgepass',
    explorerUrl: import.meta.env.VITE_SOL_EXPLORER || 'https://solscan.io',
    capabilities: SOL_CAPABILITIES,
    derivation: { status: 'supported' },
    logo: solanaLogo
  }
}

export const solCoin: CoinModule = {
  id: 'sol',
  symbol: 'SOL',
  coinSymbol: 'SOL',
  capabilities: SOL_CAPABILITIES,
  createNetwork: createSolNetwork
}
