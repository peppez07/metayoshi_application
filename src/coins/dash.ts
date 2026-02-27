import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/dash.png'

export const DASH_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createDashNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--dash',
    runtimeModelId: 'utxo',
    serverCoinId: 'dash',
    serverChain: 'main',
    name: 'Dash',
    symbol: 'DASH',
    coinType: 'UTXO',
    coinSymbol: 'DASH',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('dash', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: DASH_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'dash address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const dashCoin: CoinModule = {
  id: 'srv--dash',
  symbol: 'DASH',
  coinSymbol: 'DASH',
  capabilities: DASH_CAPABILITIES,
  createNetwork: createDashNetwork
}

