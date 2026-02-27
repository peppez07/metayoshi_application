import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import avalancheLogo from './coinlogos/avalanche.png'

export const AVAXC_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: true, assetSend: true, activity: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
}

export function createAvaxCNetwork(ctx: CoinRuntimeContext): Network {
  return {
    id: 'avaxc',
    name: 'Avalanche C-Chain',
    symbol: 'AVAX',
    coinType: 'EVM',
    coinSymbol: 'AVAX',
    chainId: 43114,
    rpcUrl: import.meta.env.VITE_AVAXC_RPC || 'https://api.avax.network/ext/bc/C/rpc',
    rpcWallet: '',
    rpcUsername: import.meta.env.VITE_AVAXC_RPC_USER || '',
    rpcPassword: import.meta.env.VITE_AVAXC_RPC_PASSWORD || '',
    bridgeUrl: ctx.buildBridgeUrl('avalanche-c-chain', 'main'),
    bridgeUsername: import.meta.env.VITE_AVAXC_BRIDGE_USER || 'bridgeuser',
    bridgePassword: import.meta.env.VITE_AVAXC_BRIDGE_PASSWORD || 'bridgepass',
    explorerUrl: import.meta.env.VITE_AVAXC_EXPLORER || 'https://snowtrace.io',
    capabilities: AVAXC_CAPABILITIES,
    logo: avalancheLogo
  }
}

export const avaxcCoin: CoinModule = {
  id: 'avaxc',
  symbol: 'AVAX',
  coinSymbol: 'AVAX',
  capabilities: AVAXC_CAPABILITIES,
  createNetwork: createAvaxCNetwork
}
