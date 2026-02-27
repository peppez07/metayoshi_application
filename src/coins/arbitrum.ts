import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import arbitrumLogo from './coinlogos/arbitrum.png'

export const ARBITRUM_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: true, assetSend: true, activity: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
}

export function createArbitrumNetwork(ctx: CoinRuntimeContext): Network {
  return {
    id: 'arb',
    name: 'Arbitrum One',
    symbol: 'ARB',
    coinType: 'EVM',
    coinSymbol: 'ETH',
    chainId: 42161,
    rpcUrl: import.meta.env.VITE_ARB_RPC || 'https://arb1.arbitrum.io/rpc',
    rpcWallet: '',
    rpcUsername: import.meta.env.VITE_ARB_RPC_USER || '',
    rpcPassword: import.meta.env.VITE_ARB_RPC_PASSWORD || '',
    bridgeUrl: ctx.buildBridgeUrl('arbitrum-one', 'main'),
    bridgeUsername: import.meta.env.VITE_ARB_BRIDGE_USER || 'bridgeuser',
    bridgePassword: import.meta.env.VITE_ARB_BRIDGE_PASSWORD || 'bridgepass',
    explorerUrl: import.meta.env.VITE_ARB_EXPLORER || 'https://arbiscan.io',
    capabilities: ARBITRUM_CAPABILITIES,
    logo: arbitrumLogo
  }
}

export const arbitrumCoin: CoinModule = {
  id: 'arb',
  symbol: 'ARB',
  coinSymbol: 'ETH',
  capabilities: ARBITRUM_CAPABILITIES,
  createNetwork: createArbitrumNetwork
}
