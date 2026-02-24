import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { XRP_API_INFO } from './interceptors'
import xrpLogo from './coinlogos/xrp.webp'

export const XRP_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createXrpNetwork(ctx: CoinRuntimeContext): Network {
  void ctx
  return {
    id: 'xrp',
    name: 'XRP',
    symbol: 'XRP',
    coinType: 'XRP',
    coinSymbol: 'XRP',
    rpcUrl: import.meta.env.VITE_XRP_RPC || XRP_API_INFO.defaultRpcUrl,
    rpcWallet: import.meta.env.VITE_XRP_RPC_WALLET || XRP_API_INFO.defaultWallet || '',
    rpcUsername: import.meta.env.VITE_XRP_RPC_USER || 'rpcuser',
    rpcPassword: import.meta.env.VITE_XRP_RPC_PASSWORD || 'rpcpass',
    bridgeUrl: import.meta.env.VITE_XRP_BRIDGE_URL || XRP_API_INFO.defaultBridgeUrl,
    explorerUrl: import.meta.env.VITE_XRP_EXPLORER || XRP_API_INFO.defaultExplorerUrl || 'https://xrpscan.com',
    capabilities: XRP_CAPABILITIES,
    logo: xrpLogo
  }
}

export const xrpCoin: CoinModule = {
  id: 'xrp',
  symbol: 'XRP',
  coinSymbol: 'XRP',
  capabilities: XRP_CAPABILITIES,
  createNetwork: createXrpNetwork
}
