import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const BITCANNA_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createBitcannaNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--bitcanna',
    runtimeModelId: 'utxo',
    serverCoinId: 'bitcanna',
    serverChain: 'main',
    name: 'Bitcanna',
    symbol: 'BITCAN',
    coinType: 'UTXO',
    coinSymbol: 'BITCAN',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('bitcanna', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: BITCANNA_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'bitcanna address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const bitcannaCoin: CoinModule = {
  id: 'srv--bitcanna',
  symbol: 'BITCAN',
  coinSymbol: 'BITCAN',
  capabilities: BITCANNA_CAPABILITIES,
  createNetwork: createBitcannaNetwork
}

