import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'

export const TRON_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: false, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: false, showActivityTab: true }
}

export function createTronNetwork(ctx: CoinRuntimeContext): Network {
  return {
    id: 'tron',
    name: 'TRON',
    symbol: 'TRX',
    coinType: 'BTC',
    coinSymbol: 'TRX',
    rpcUrl: import.meta.env.VITE_TRON_RPC || 'https://api.trongrid.io',
    rpcWallet: '',
    rpcUsername: import.meta.env.VITE_TRON_RPC_USER || '',
    rpcPassword: import.meta.env.VITE_TRON_RPC_PASSWORD || '',
    bridgeUrl: import.meta.env.VITE_TRON_BRIDGE_URL || ctx.buildBridgeUrl('tron', 'main'),
    bridgeUsername: import.meta.env.VITE_TRON_BRIDGE_USER || 'bridgeuser',
    bridgePassword: import.meta.env.VITE_TRON_BRIDGE_PASSWORD || 'bridgepass',
    explorerUrl: import.meta.env.VITE_TRON_EXPLORER || 'https://tronscan.org',
    capabilities: TRON_CAPABILITIES,
    derivation: { status: 'unsupported', reason: 'Native TRON derivation/signing is not implemented in this build yet' }
  }
}

export const tronCoin: CoinModule = {
  id: 'tron',
  symbol: 'TRX',
  coinSymbol: 'TRX',
  capabilities: TRON_CAPABILITIES,
  createNetwork: createTronNetwork
}

