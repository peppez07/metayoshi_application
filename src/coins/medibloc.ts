import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const MEDIBLOC_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createMediblocNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--medibloc',
    runtimeModelId: 'utxo',
    serverCoinId: 'medibloc',
    serverChain: 'main',
    name: 'Medibloc',
    symbol: 'MEDIBL',
    coinType: 'UTXO',
    coinSymbol: 'MEDIBL',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('medibloc', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: MEDIBLOC_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'medibloc address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const mediblocCoin: CoinModule = {
  id: 'srv--medibloc',
  symbol: 'MEDIBL',
  coinSymbol: 'MEDIBL',
  capabilities: MEDIBLOC_CAPABILITIES,
  createNetwork: createMediblocNetwork
}

