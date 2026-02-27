import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const ASSETMANTLE_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createAssetMantleNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--asset-mantle',
    runtimeModelId: 'utxo',
    serverCoinId: 'asset-mantle',
    serverChain: 'main',
    name: 'Asset Mantle',
    symbol: 'ASSETM',
    coinType: 'UTXO',
    coinSymbol: 'ASSETM',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('asset-mantle', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: ASSETMANTLE_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'asset-mantle address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const assetMantleCoin: CoinModule = {
  id: 'srv--asset-mantle',
  symbol: 'ASSETM',
  coinSymbol: 'ASSETM',
  capabilities: ASSETMANTLE_CAPABILITIES,
  createNetwork: createAssetMantleNetwork
}

