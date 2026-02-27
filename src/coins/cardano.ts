import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import { ADA_API_INFO } from './interceptors'
import cardanoLogo from './coinlogos/cardano.png'

export const ADA_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createCardanoNetwork(ctx: CoinRuntimeContext): Network {
  return {
    id: 'ada',
    name: 'Cardano',
    symbol: 'ADA',
    coinType: 'BTC',
    coinSymbol: 'ADA',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: import.meta.env.VITE_ADA_RPC_WALLET || ADA_API_INFO.defaultWallet || '',
    rpcUsername: import.meta.env.VITE_ADA_RPC_USER || 'rpcuser',
    rpcPassword: import.meta.env.VITE_ADA_RPC_PASSWORD || 'rpcpass',
    bridgeUrl: ctx.buildBridgeUrl('cardano', 'main'),
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
