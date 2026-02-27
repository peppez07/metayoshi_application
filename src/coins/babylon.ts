import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/babylon.png'

export const BABYLON_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createBabylonNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--babylon',
    runtimeModelId: 'utxo',
    serverCoinId: 'babylon',
    serverChain: 'main',
    name: 'Babylon',
    symbol: 'BABYLO',
    coinType: 'UTXO',
    coinSymbol: 'BABYLO',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('babylon', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: BABYLON_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'babylon address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const babylonCoin: CoinModule = {
  id: 'srv--babylon',
  symbol: 'BABYLO',
  coinSymbol: 'BABYLO',
  capabilities: BABYLON_CAPABILITIES,
  createNetwork: createBabylonNetwork
}

