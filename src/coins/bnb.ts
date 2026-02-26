import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import bnbLogo from './coinlogos/bnb.webp'

export const BNB_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: true, assetSend: false, activity: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
}

export function createBnbNetwork(ctx: CoinRuntimeContext): Network {
  return {
    id: 'bnb',
    name: 'BNB Smart Chain',
    symbol: 'BNB',
    coinType: 'EVM',
    coinSymbol: 'BNB',
    chainId: 56,
    rpcUrl: import.meta.env.VITE_BNB_RPC || 'https://bsc-dataseed.binance.org',
    rpcWallet: '',
    rpcUsername: import.meta.env.VITE_BNB_RPC_USER || '',
    rpcPassword: import.meta.env.VITE_BNB_RPC_PASSWORD || '',
    bridgeUrl: import.meta.env.VITE_BNB_BRIDGE_URL || ctx.buildBridgeUrl('bsc', 'main'),
    bridgeUsername: import.meta.env.VITE_BNB_BRIDGE_USER || 'bridgeuser',
    bridgePassword: import.meta.env.VITE_BNB_BRIDGE_PASSWORD || 'bridgepass',
    explorerUrl: import.meta.env.VITE_BNB_EXPLORER || 'https://bscscan.com',
    capabilities: BNB_CAPABILITIES,
    logo: bnbLogo
  }
}

export const bnbCoin: CoinModule = {
  id: 'bnb',
  symbol: 'BNB',
  coinSymbol: 'BNB',
  capabilities: BNB_CAPABILITIES,
  createNetwork: createBnbNetwork
}
