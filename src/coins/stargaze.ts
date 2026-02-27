import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const STARGAZE_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createStargazeNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--stargaze',
    runtimeModelId: 'utxo',
    serverCoinId: 'stargaze',
    serverChain: 'main',
    name: 'Stargaze',
    symbol: 'STARGA',
    coinType: 'UTXO',
    coinSymbol: 'STARGA',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('stargaze', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: STARGAZE_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'stargaze address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const stargazeCoin: CoinModule = {
  id: 'srv--stargaze',
  symbol: 'STARGA',
  coinSymbol: 'STARGA',
  capabilities: STARGAZE_CAPABILITIES,
  createNetwork: createStargazeNetwork
}

