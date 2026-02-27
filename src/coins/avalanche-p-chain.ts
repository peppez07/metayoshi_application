import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/avalanche.png'

export const AVALANCHEPCHAIN_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createAvalanchePChainNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--avalanche-p-chain',
    runtimeModelId: 'utxo',
    serverCoinId: 'avalanche-p-chain',
    serverChain: 'main',
    name: 'Avalanche P Chain',
    symbol: 'AVALAN',
    coinType: 'UTXO',
    coinSymbol: 'AVALAN',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('avalanche-p-chain', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: AVALANCHEPCHAIN_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'avalanche-p-chain address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const avalanchePChainCoin: CoinModule = {
  id: 'srv--avalanche-p-chain',
  symbol: 'AVALAN',
  coinSymbol: 'AVALAN',
  capabilities: AVALANCHEPCHAIN_CAPABILITIES,
  createNetwork: createAvalanchePChainNetwork
}

