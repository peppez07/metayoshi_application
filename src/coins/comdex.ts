import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const COMDEX_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createComdexNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--comdex',
    runtimeModelId: 'utxo',
    serverCoinId: 'comdex',
    serverChain: 'main',
    name: 'Comdex',
    symbol: 'COMDEX',
    coinType: 'UTXO',
    coinSymbol: 'COMDEX',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('comdex', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: COMDEX_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'comdex address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const comdexCoin: CoinModule = {
  id: 'srv--comdex',
  symbol: 'COMDEX',
  coinSymbol: 'COMDEX',
  capabilities: COMDEX_CAPABILITIES,
  createNetwork: createComdexNetwork
}

