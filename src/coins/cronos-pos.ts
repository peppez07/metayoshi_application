import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/cronos.png'

export const CRONOSPOS_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createCronosPosNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--cronos-pos',
    runtimeModelId: 'utxo',
    serverCoinId: 'cronos-pos',
    serverChain: 'main',
    name: 'Cronos Pos',
    symbol: 'CRONOS',
    coinType: 'UTXO',
    coinSymbol: 'CRONOS',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('cronos-pos', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: CRONOSPOS_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'cronos-pos address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const cronosPosCoin: CoinModule = {
  id: 'srv--cronos-pos',
  symbol: 'CRONOS',
  coinSymbol: 'CRONOS',
  capabilities: CRONOSPOS_CAPABILITIES,
  createNetwork: createCronosPosNetwork
}

