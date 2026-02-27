import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/artificial-superintelligence-alliance.png'

export const FETCH_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createFetchNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--fetch',
    runtimeModelId: 'utxo',
    serverCoinId: 'fetch',
    serverChain: 'main',
    name: 'Fetch',
    symbol: 'FETCH',
    coinType: 'UTXO',
    coinSymbol: 'FETCH',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('fetch', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: FETCH_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'fetch address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const fetchCoin: CoinModule = {
  id: 'srv--fetch',
  symbol: 'FETCH',
  coinSymbol: 'FETCH',
  capabilities: FETCH_CAPABILITIES,
  createNetwork: createFetchNetwork
}

