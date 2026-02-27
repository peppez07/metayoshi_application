import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/celer-network.png'

export const CELER_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createCelerNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--celer',
    runtimeModelId: 'utxo',
    serverCoinId: 'celer',
    serverChain: 'main',
    name: 'Celer',
    symbol: 'CELER',
    coinType: 'UTXO',
    coinSymbol: 'CELER',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('celer', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: CELER_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'celer address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const celerCoin: CoinModule = {
  id: 'srv--celer',
  symbol: 'CELER',
  coinSymbol: 'CELER',
  capabilities: CELER_CAPABILITIES,
  createNetwork: createCelerNetwork
}

