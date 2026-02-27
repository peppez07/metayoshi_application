import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const KUJIRA_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createKujiraNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--kujira',
    runtimeModelId: 'utxo',
    serverCoinId: 'kujira',
    serverChain: 'main',
    name: 'Kujira',
    symbol: 'KUJIRA',
    coinType: 'UTXO',
    coinSymbol: 'KUJIRA',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('kujira', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: KUJIRA_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'kujira address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const kujiraCoin: CoinModule = {
  id: 'srv--kujira',
  symbol: 'KUJIRA',
  coinSymbol: 'KUJIRA',
  capabilities: KUJIRA_CAPABILITIES,
  createNetwork: createKujiraNetwork
}

