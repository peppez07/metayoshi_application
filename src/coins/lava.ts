import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/lava-network.png'

export const LAVA_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createLavaNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--lava',
    runtimeModelId: 'utxo',
    serverCoinId: 'lava',
    serverChain: 'main',
    name: 'Lava',
    symbol: 'LAVA',
    coinType: 'UTXO',
    coinSymbol: 'LAVA',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('lava', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: LAVA_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'lava address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const lavaCoin: CoinModule = {
  id: 'srv--lava',
  symbol: 'LAVA',
  coinSymbol: 'LAVA',
  capabilities: LAVA_CAPABILITIES,
  createNetwork: createLavaNetwork
}

