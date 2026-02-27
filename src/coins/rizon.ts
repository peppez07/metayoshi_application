import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const RIZON_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createRizonNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--rizon',
    runtimeModelId: 'utxo',
    serverCoinId: 'rizon',
    serverChain: 'main',
    name: 'Rizon',
    symbol: 'RIZON',
    coinType: 'UTXO',
    coinSymbol: 'RIZON',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('rizon', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: RIZON_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'rizon address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const rizonCoin: CoinModule = {
  id: 'srv--rizon',
  symbol: 'RIZON',
  coinSymbol: 'RIZON',
  capabilities: RIZON_CAPABILITIES,
  createNetwork: createRizonNetwork
}

