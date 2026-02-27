import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const SIFCHAIN_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createSifchainNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--sifchain',
    runtimeModelId: 'utxo',
    serverCoinId: 'sifchain',
    serverChain: 'main',
    name: 'Sifchain',
    symbol: 'SIFCHA',
    coinType: 'UTXO',
    coinSymbol: 'SIFCHA',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('sifchain', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: SIFCHAIN_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'sifchain address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const sifchainCoin: CoinModule = {
  id: 'srv--sifchain',
  symbol: 'SIFCHA',
  coinSymbol: 'SIFCHA',
  capabilities: SIFCHAIN_CAPABILITIES,
  createNetwork: createSifchainNetwork
}

