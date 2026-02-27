import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const REGEN_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createRegenNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--regen',
    runtimeModelId: 'utxo',
    serverCoinId: 'regen',
    serverChain: 'main',
    name: 'Regen',
    symbol: 'REGEN',
    coinType: 'UTXO',
    coinSymbol: 'REGEN',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('regen', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: REGEN_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'regen address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const regenCoin: CoinModule = {
  id: 'srv--regen',
  symbol: 'REGEN',
  coinSymbol: 'REGEN',
  capabilities: REGEN_CAPABILITIES,
  createNetwork: createRegenNetwork
}

