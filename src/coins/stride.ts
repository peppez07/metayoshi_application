import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const STRIDE_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createStrideNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--stride',
    runtimeModelId: 'utxo',
    serverCoinId: 'stride',
    serverChain: 'main',
    name: 'Stride',
    symbol: 'STRIDE',
    coinType: 'UTXO',
    coinSymbol: 'STRIDE',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('stride', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: STRIDE_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'stride address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const strideCoin: CoinModule = {
  id: 'srv--stride',
  symbol: 'STRIDE',
  coinSymbol: 'STRIDE',
  capabilities: STRIDE_CAPABILITIES,
  createNetwork: createStrideNetwork
}

