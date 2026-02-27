import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const AVALANCHEFUJIPCHAIN_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createAvalancheFujiPChainNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--avalanche-fuji-p-chain',
    runtimeModelId: 'utxo',
    serverCoinId: 'avalanche-fuji-p-chain',
    serverChain: 'main',
    name: 'Avalanche Fuji P Chain',
    symbol: 'AVALAN',
    coinType: 'UTXO',
    coinSymbol: 'AVALAN',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('avalanche-fuji-p-chain', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: AVALANCHEFUJIPCHAIN_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'avalanche-fuji-p-chain address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const avalancheFujiPChainCoin: CoinModule = {
  id: 'srv--avalanche-fuji-p-chain',
  symbol: 'AVALAN',
  coinSymbol: 'AVALAN',
  capabilities: AVALANCHEFUJIPCHAIN_CAPABILITIES,
  createNetwork: createAvalancheFujiPChainNetwork
}

