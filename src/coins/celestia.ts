import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const CELESTIA_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createCelestiaNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--celestia',
    runtimeModelId: 'utxo',
    serverCoinId: 'celestia',
    serverChain: 'main',
    name: 'Celestia',
    symbol: 'CELEST',
    coinType: 'UTXO',
    coinSymbol: 'CELEST',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('celestia', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: CELESTIA_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'celestia address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const celestiaCoin: CoinModule = {
  id: 'srv--celestia',
  symbol: 'CELEST',
  coinSymbol: 'CELEST',
  capabilities: CELESTIA_CAPABILITIES,
  createNetwork: createCelestiaNetwork
}

