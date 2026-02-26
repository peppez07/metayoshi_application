import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import xlmLogo from './coinlogos/xlm.png'

export const XLM_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createXlmNetwork(ctx: CoinRuntimeContext): Network {
  return {
    id: 'xlm',
    name: 'Stellar',
    symbol: 'XLM',
    coinType: 'BTC',
    coinSymbol: 'XLM',
    rpcUrl: import.meta.env.VITE_XLM_RPC || 'https://horizon.stellar.org',
    rpcWallet: '',
    rpcUsername: import.meta.env.VITE_XLM_RPC_USER || '',
    rpcPassword: import.meta.env.VITE_XLM_RPC_PASSWORD || '',
    bridgeUrl: import.meta.env.VITE_XLM_BRIDGE_URL || ctx.buildBridgeUrl('stellar', 'main'),
    bridgeUsername: import.meta.env.VITE_XLM_BRIDGE_USER || 'bridgeuser',
    bridgePassword: import.meta.env.VITE_XLM_BRIDGE_PASSWORD || 'bridgepass',
    explorerUrl: import.meta.env.VITE_XLM_EXPLORER || 'https://stellar.expert/explorer/public',
    capabilities: XLM_CAPABILITIES,
    derivation: { status: 'supported' },
    logo: xlmLogo
  }
}

export const xlmCoin: CoinModule = {
  id: 'xlm',
  symbol: 'XLM',
  coinSymbol: 'XLM',
  capabilities: XLM_CAPABILITIES,
  createNetwork: createXlmNetwork
}
