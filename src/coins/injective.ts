import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/injective.png'

export const INJECTIVE_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createInjectiveNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--injective',
    runtimeModelId: 'utxo',
    serverCoinId: 'injective',
    serverChain: 'main',
    name: 'Injective',
    symbol: 'INJECT',
    coinType: 'UTXO',
    coinSymbol: 'INJECT',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('injective', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: INJECTIVE_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'injective address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const injectiveCoin: CoinModule = {
  id: 'srv--injective',
  symbol: 'INJECT',
  coinSymbol: 'INJECT',
  capabilities: INJECTIVE_CAPABILITIES,
  createNetwork: createInjectiveNetwork
}

