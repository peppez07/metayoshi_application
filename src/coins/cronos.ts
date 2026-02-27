import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import cosmosLogo from './coinlogos/cosmos.png'

export const CRO_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createCroNetwork(ctx: CoinRuntimeContext): Network {
  return {
    id: 'cro',
    runtimeModelId: 'crocosmos',
    serverCoinId: 'cronos-pos',
    serverChain: 'main',
    name: 'Cosmos',
    symbol: 'COSMOS',
    coinType: 'UTXO',
    coinSymbol: 'CRO',
    rpcUrl: import.meta.env.VITE_CRO_RPC || ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: import.meta.env.VITE_CRO_RPC_USER || '',
    rpcPassword: import.meta.env.VITE_CRO_RPC_PASSWORD || '',
    bridgeUrl: ctx.buildBridgeUrl('cronos-pos', 'main'),
    bridgeUsername: import.meta.env.VITE_CRO_BRIDGE_USER || 'bridgeuser',
    bridgePassword: import.meta.env.VITE_CRO_BRIDGE_PASSWORD || 'bridgepass',
    explorerUrl: import.meta.env.VITE_CRO_EXPLORER || 'https://crypto.org/explorer/account',
    capabilities: CRO_CAPABILITIES,
    logo: cosmosLogo
  }
}

export const croCoin: CoinModule = {
  id: 'cro',
  symbol: 'COSMOS',
  coinSymbol: 'CRO',
  capabilities: CRO_CAPABILITIES,
  createNetwork: createCroNetwork
}
