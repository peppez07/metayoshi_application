import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/cosmos.png'

export const COSMOS_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: true, assetSend: false, activity: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
}

export function createCosmosNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--cosmos',
    runtimeModelId: 'cosmos',
    serverCoinId: 'cosmos',
    serverChain: 'main',
    name: 'Cosmos',
    symbol: 'ATOM',
    coinType: 'UTXO',
    coinSymbol: 'ATOM',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('cosmos', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: COSMOS_CAPABILITIES,
    logo: utxoLogo
  }
}

export const cosmosCoin: CoinModule = {
  id: 'srv--cosmos',
  symbol: 'ATOM',
  coinSymbol: 'ATOM',
  capabilities: COSMOS_CAPABILITIES,
  createNetwork: createCosmosNetwork
}

