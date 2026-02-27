import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/cosmos.png'

export const COSMOS_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createCosmosNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--cosmos',
    runtimeModelId: 'utxo',
    serverCoinId: 'cosmos',
    serverChain: 'main',
    name: 'Cosmos',
    symbol: 'COSMOS',
    coinType: 'UTXO',
    coinSymbol: 'COSMOS',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('cosmos', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: COSMOS_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'cosmos address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const cosmosCoin: CoinModule = {
  id: 'srv--cosmos',
  symbol: 'COSMOS',
  coinSymbol: 'COSMOS',
  capabilities: COSMOS_CAPABILITIES,
  createNetwork: createCosmosNetwork
}

