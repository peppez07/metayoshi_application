import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const CHEQD_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createCheqdNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--cheqd',
    runtimeModelId: 'utxo',
    serverCoinId: 'cheqd',
    serverChain: 'main',
    name: 'Cheqd',
    symbol: 'CHEQD',
    coinType: 'UTXO',
    coinSymbol: 'CHEQD',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('cheqd', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: CHEQD_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'cheqd address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const cheqdCoin: CoinModule = {
  id: 'srv--cheqd',
  symbol: 'CHEQD',
  coinSymbol: 'CHEQD',
  capabilities: CHEQD_CAPABILITIES,
  createNetwork: createCheqdNetwork
}

