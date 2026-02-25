import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { ADA_API_INFO } from './interceptors'
import cardanoLogo from './coinlogos/cardano.webp'

export const ADA_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createCardanoNetwork(ctx: CoinRuntimeContext): Network {
  void ctx
  return {
    id: 'ada',
    name: 'Cardano',
    symbol: 'ADA',
    coinType: 'BTC',
    coinSymbol: 'ADA',
    rpcUrl: import.meta.env.VITE_ADA_RPC || ADA_API_INFO.defaultRpcUrl,
    rpcWallet: import.meta.env.VITE_ADA_RPC_WALLET || ADA_API_INFO.defaultWallet || '',
    rpcUsername: import.meta.env.VITE_ADA_RPC_USER || 'rpcuser',
    rpcPassword: import.meta.env.VITE_ADA_RPC_PASSWORD || 'rpcpass',
    bridgeUrl: import.meta.env.VITE_ADA_BRIDGE_URL || ADA_API_INFO.defaultBridgeUrl,
    explorerUrl: import.meta.env.VITE_ADA_EXPLORER || ADA_API_INFO.defaultExplorerUrl || 'https://cardanoscan.io',
    capabilities: ADA_CAPABILITIES,
    derivation: { status: 'supported' },
    logo: cardanoLogo
  }
}

export const cardanoCoin: CoinModule = {
  id: 'ada',
  symbol: 'ADA',
  coinSymbol: 'ADA',
  capabilities: ADA_CAPABILITIES,
  createNetwork: createCardanoNetwork
}
