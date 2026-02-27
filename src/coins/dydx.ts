import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const DYDX_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createDydxNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--dydx',
    runtimeModelId: 'utxo',
    serverCoinId: 'dydx',
    serverChain: 'main',
    name: 'Dydx',
    symbol: 'DYDX',
    coinType: 'UTXO',
    coinSymbol: 'DYDX',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('dydx', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: DYDX_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'dydx address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const dydxCoin: CoinModule = {
  id: 'srv--dydx',
  symbol: 'DYDX',
  coinSymbol: 'DYDX',
  capabilities: DYDX_CAPABILITIES,
  createNetwork: createDydxNetwork
}

