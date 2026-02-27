import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/akash-network.png'

export const AKASH_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createAkashNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--akash',
    runtimeModelId: 'utxo',
    serverCoinId: 'akash',
    serverChain: 'main',
    name: 'Akash',
    symbol: 'AKASH',
    coinType: 'UTXO',
    coinSymbol: 'AKASH',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('akash', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: AKASH_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'akash address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const akashCoin: CoinModule = {
  id: 'srv--akash',
  symbol: 'AKASH',
  coinSymbol: 'AKASH',
  capabilities: AKASH_CAPABILITIES,
  createNetwork: createAkashNetwork
}

