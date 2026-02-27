import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const CHILIZSPICY_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createChilizSpicyNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--chiliz-spicy',
    runtimeModelId: 'utxo',
    serverCoinId: 'chiliz-spicy',
    serverChain: 'main',
    name: 'Chiliz Spicy',
    symbol: 'CHILIZ',
    coinType: 'UTXO',
    coinSymbol: 'CHILIZ',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('chiliz-spicy', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: CHILIZSPICY_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'chiliz-spicy address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const chilizSpicyCoin: CoinModule = {
  id: 'srv--chiliz-spicy',
  symbol: 'CHILIZ',
  coinSymbol: 'CHILIZ',
  capabilities: CHILIZSPICY_CAPABILITIES,
  createNetwork: createChilizSpicyNetwork
}

