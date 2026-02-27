import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const COREUM_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createCoreumNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--coreum',
    runtimeModelId: 'utxo',
    serverCoinId: 'coreum',
    serverChain: 'main',
    name: 'Coreum',
    symbol: 'COREUM',
    coinType: 'UTXO',
    coinSymbol: 'COREUM',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('coreum', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: COREUM_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'coreum address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const coreumCoin: CoinModule = {
  id: 'srv--coreum',
  symbol: 'COREUM',
  coinSymbol: 'COREUM',
  capabilities: COREUM_CAPABILITIES,
  createNetwork: createCoreumNetwork
}

