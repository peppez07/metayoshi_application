import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const QUICKSILVER_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createQuicksilverNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--quicksilver',
    runtimeModelId: 'utxo',
    serverCoinId: 'quicksilver',
    serverChain: 'main',
    name: 'Quicksilver',
    symbol: 'QUICKS',
    coinType: 'UTXO',
    coinSymbol: 'QUICKS',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('quicksilver', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: QUICKSILVER_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'quicksilver address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const quicksilverCoin: CoinModule = {
  id: 'srv--quicksilver',
  symbol: 'QUICKS',
  coinSymbol: 'QUICKS',
  capabilities: QUICKSILVER_CAPABILITIES,
  createNetwork: createQuicksilverNetwork
}

