import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const AVAIL_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createAvailNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--avail',
    runtimeModelId: 'utxo',
    serverCoinId: 'avail',
    serverChain: 'main',
    name: 'Avail',
    symbol: 'AVAIL',
    coinType: 'UTXO',
    coinSymbol: 'AVAIL',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('avail', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: AVAIL_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'avail address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const availCoin: CoinModule = {
  id: 'srv--avail',
  symbol: 'AVAIL',
  coinSymbol: 'AVAIL',
  capabilities: AVAIL_CAPABILITIES,
  createNetwork: createAvailNetwork
}

