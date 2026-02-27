import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/terra-luna-v2.png'

export const TERRA_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createTerraNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--terra',
    runtimeModelId: 'utxo',
    serverCoinId: 'terra',
    serverChain: 'main',
    name: 'Terra',
    symbol: 'TERRA',
    coinType: 'UTXO',
    coinSymbol: 'TERRA',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('terra', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: TERRA_CAPABILITIES,
    derivation: { status: 'supported' },
    logo: utxoLogo
  }
}

export const terraCoin: CoinModule = {
  id: 'srv--terra',
  symbol: 'TERRA',
  coinSymbol: 'TERRA',
  capabilities: TERRA_CAPABILITIES,
  createNetwork: createTerraNetwork
}

