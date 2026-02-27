import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/zero-gravity.png'

export const C0G_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createC0gNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--0g',
    runtimeModelId: 'utxo',
    serverCoinId: '0g',
    serverChain: 'main',
    name: '0G',
    symbol: '0G',
    coinType: 'UTXO',
    coinSymbol: '0G',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('0g', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: C0G_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: '0g address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const c0gCoin: CoinModule = {
  id: 'srv--0g',
  symbol: '0G',
  coinSymbol: '0G',
  capabilities: C0G_CAPABILITIES,
  createNetwork: createC0gNetwork
}

