import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { XRP_API_INFO } from './interceptors'
import xrpLogo from './coinlogos/xrp.png'

export const XRP_CAPABILITIES: NetworkCapabilitiesInput = {
  // XRPL supports trustline-issued assets; we enable asset listing as "ecosystem".
  // Asset sending is not enabled yet (requires Payment with issued Amount + trustline UX).
  features: { nativeSend: true, assetLayer: true, assetSend: false, activity: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
}

export function createXrpNetwork(ctx: CoinRuntimeContext): Network {
  const wallet = import.meta.env.VITE_XRP_RPC_WALLET || XRP_API_INFO.defaultWallet || ''
  return {
    id: 'xrp',
    name: 'XRP',
    symbol: 'XRP',
    coinType: 'XRP',
    coinSymbol: 'XRP',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: wallet,
    rpcUsername: import.meta.env.VITE_XRP_RPC_USER || 'rpcuser',
    rpcPassword: import.meta.env.VITE_XRP_RPC_PASSWORD || 'rpcpass',
    bridgeUrl: ctx.buildBridgeUrl('xrp', 'main', wallet || undefined),
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
