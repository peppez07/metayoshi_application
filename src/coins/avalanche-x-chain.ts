import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/avalanche.png'

export const AVALANCHEXCHAIN_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createAvalancheXChainNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--avalanche-x-chain',
    runtimeModelId: 'utxo',
    serverCoinId: 'avalanche-x-chain',
    serverChain: 'main',
    name: 'Avalanche X Chain',
    symbol: 'AVALAN',
    coinType: 'UTXO',
    coinSymbol: 'AVALAN',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('avalanche-x-chain', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: AVALANCHEXCHAIN_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'avalanche-x-chain address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const avalancheXChainCoin: CoinModule = {
  id: 'srv--avalanche-x-chain',
  symbol: 'AVALAN',
  coinSymbol: 'AVALAN',
  capabilities: AVALANCHEXCHAIN_CAPABILITIES,
  createNetwork: createAvalancheXChainNetwork
}

