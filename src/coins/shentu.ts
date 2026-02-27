import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const SHENTU_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createShentuNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--shentu',
    runtimeModelId: 'utxo',
    serverCoinId: 'shentu',
    serverChain: 'main',
    name: 'Shentu',
    symbol: 'SHENTU',
    coinType: 'UTXO',
    coinSymbol: 'SHENTU',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('shentu', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: SHENTU_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'shentu address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const shentuCoin: CoinModule = {
  id: 'srv--shentu',
  symbol: 'SHENTU',
  coinSymbol: 'SHENTU',
  capabilities: SHENTU_CAPABILITIES,
  createNetwork: createShentuNetwork
}

