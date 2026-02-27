import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/dora.png'

export const DORA_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createDoraNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--dora',
    runtimeModelId: 'utxo',
    serverCoinId: 'dora',
    serverChain: 'main',
    name: 'Dora',
    symbol: 'DORA',
    coinType: 'UTXO',
    coinSymbol: 'DORA',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('dora', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: DORA_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'dora address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const doraCoin: CoinModule = {
  id: 'srv--dora',
  symbol: 'DORA',
  coinSymbol: 'DORA',
  capabilities: DORA_CAPABILITIES,
  createNetwork: createDoraNetwork
}

