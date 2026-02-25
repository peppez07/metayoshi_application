import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { XMR_API_INFO } from './interceptors'
import moneroLogo from './coinlogos/monero.webp'

const XMR_NON_CUSTODIAL_ENABLED = /^(1|true|yes)$/i.test(String(import.meta.env.VITE_ENABLE_XMR_NON_CUSTODIAL || 'false'))

export const XMR_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: XMR_NON_CUSTODIAL_ENABLED, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: XMR_NON_CUSTODIAL_ENABLED, showActivityTab: true }
}

export function createMoneroNetwork(ctx: CoinRuntimeContext): Network {
  void ctx
  return {
    id: 'xmr',
    name: 'Monero',
    symbol: 'XMR',
    coinType: 'BTC',
    coinSymbol: 'XMR',
    rpcUrl: import.meta.env.VITE_XMR_RPC || XMR_API_INFO.defaultRpcUrl,
    rpcWallet: import.meta.env.VITE_XMR_RPC_WALLET || XMR_API_INFO.defaultWallet || '',
    rpcUsername: import.meta.env.VITE_XMR_RPC_USER || 'rpcuser',
    rpcPassword: import.meta.env.VITE_XMR_RPC_PASSWORD || 'rpcpass',
    bridgeUrl: import.meta.env.VITE_XMR_BRIDGE_URL || XMR_API_INFO.defaultBridgeUrl,
    explorerUrl: import.meta.env.VITE_XMR_EXPLORER || XMR_API_INFO.defaultExplorerUrl || 'https://xmrchain.net',
    capabilities: XMR_CAPABILITIES,
    derivation: { status: 'supported' },
    logo: moneroLogo
  }
}

export const moneroCoin: CoinModule = {
  id: 'xmr',
  symbol: 'XMR',
  coinSymbol: 'XMR',
  capabilities: XMR_CAPABILITIES,
  createNetwork: createMoneroNetwork
}
