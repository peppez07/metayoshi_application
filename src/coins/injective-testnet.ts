import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const INJECTIVETESTNET_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createInjectiveTestnetNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--injective-testnet',
    runtimeModelId: 'utxo',
    serverCoinId: 'injective-testnet',
    serverChain: 'main',
    name: 'Injective Testnet',
    symbol: 'INJECT',
    coinType: 'UTXO',
    coinSymbol: 'INJECT',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('injective-testnet', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: INJECTIVETESTNET_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'injective-testnet address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const injectiveTestnetCoin: CoinModule = {
  id: 'srv--injective-testnet',
  symbol: 'INJECT',
  coinSymbol: 'INJECT',
  capabilities: INJECTIVETESTNET_CAPABILITIES,
  createNetwork: createInjectiveTestnetNetwork
}

