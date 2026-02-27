import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const SENTINEL_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createSentinelNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--sentinel',
    runtimeModelId: 'utxo',
    serverCoinId: 'sentinel',
    serverChain: 'main',
    name: 'Sentinel',
    symbol: 'SENTIN',
    coinType: 'UTXO',
    coinSymbol: 'SENTIN',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('sentinel', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: SENTINEL_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'sentinel address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const sentinelCoin: CoinModule = {
  id: 'srv--sentinel',
  symbol: 'SENTIN',
  coinSymbol: 'SENTIN',
  capabilities: SENTINEL_CAPABILITIES,
  createNetwork: createSentinelNetwork
}

