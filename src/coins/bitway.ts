import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const BITWAY_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createBitwayNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--bitway',
    runtimeModelId: 'utxo',
    serverCoinId: 'bitway',
    serverChain: 'main',
    name: 'Bitway',
    symbol: 'BITWAY',
    coinType: 'UTXO',
    coinSymbol: 'BITWAY',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('bitway', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: BITWAY_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'bitway address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const bitwayCoin: CoinModule = {
  id: 'srv--bitway',
  symbol: 'BITWAY',
  coinSymbol: 'BITWAY',
  capabilities: BITWAY_CAPABILITIES,
  createNetwork: createBitwayNetwork
}

