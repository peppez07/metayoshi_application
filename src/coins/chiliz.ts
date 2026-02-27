import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const CHILIZ_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createChilizNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--chiliz',
    runtimeModelId: 'utxo',
    serverCoinId: 'chiliz',
    serverChain: 'main',
    name: 'Chiliz',
    symbol: 'CHILIZ',
    coinType: 'UTXO',
    coinSymbol: 'CHILIZ',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('chiliz', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: CHILIZ_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'chiliz address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const chilizCoin: CoinModule = {
  id: 'srv--chiliz',
  symbol: 'CHILIZ',
  coinSymbol: 'CHILIZ',
  capabilities: CHILIZ_CAPABILITIES,
  createNetwork: createChilizNetwork
}

