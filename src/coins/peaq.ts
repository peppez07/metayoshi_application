import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const PEAQ_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createPeaqNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--peaq',
    runtimeModelId: 'utxo',
    serverCoinId: 'peaq',
    serverChain: 'main',
    name: 'Peaq',
    symbol: 'PEAQ',
    coinType: 'UTXO',
    coinSymbol: 'PEAQ',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('peaq', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: PEAQ_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'peaq address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const peaqCoin: CoinModule = {
  id: 'srv--peaq',
  symbol: 'PEAQ',
  coinSymbol: 'PEAQ',
  capabilities: PEAQ_CAPABILITIES,
  createNetwork: createPeaqNetwork
}

