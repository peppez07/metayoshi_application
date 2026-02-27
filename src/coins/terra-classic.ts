import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/terra-luna.png'

export const TERRACLASSIC_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createTerraClassicNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--terra-classic',
    runtimeModelId: 'utxo',
    serverCoinId: 'terra-classic',
    serverChain: 'main',
    name: 'Terra Classic',
    symbol: 'TERRAC',
    coinType: 'UTXO',
    coinSymbol: 'TERRAC',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('terra-classic', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: TERRACLASSIC_CAPABILITIES,
    derivation: { status: 'supported' },
    logo: utxoLogo
  }
}

export const terraClassicCoin: CoinModule = {
  id: 'srv--terra-classic',
  symbol: 'TERRAC',
  coinSymbol: 'TERRAC',
  capabilities: TERRACLASSIC_CAPABILITIES,
  createNetwork: createTerraClassicNetwork
}

