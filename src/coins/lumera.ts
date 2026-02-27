import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const LUMERA_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createLumeraNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--lumera',
    runtimeModelId: 'utxo',
    serverCoinId: 'lumera',
    serverChain: 'main',
    name: 'Lumera',
    symbol: 'LUMERA',
    coinType: 'UTXO',
    coinSymbol: 'LUMERA',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('lumera', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: LUMERA_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'lumera address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const lumeraCoin: CoinModule = {
  id: 'srv--lumera',
  symbol: 'LUMERA',
  coinSymbol: 'LUMERA',
  capabilities: LUMERA_CAPABILITIES,
  createNetwork: createLumeraNetwork
}

