import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/oraichain-token.png'

export const ORAICHAIN_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createOraichainNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--oraichain',
    runtimeModelId: 'utxo',
    serverCoinId: 'oraichain',
    serverChain: 'main',
    name: 'Oraichain',
    symbol: 'ORAICH',
    coinType: 'UTXO',
    coinSymbol: 'ORAICH',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('oraichain', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: ORAICHAIN_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'oraichain address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const oraichainCoin: CoinModule = {
  id: 'srv--oraichain',
  symbol: 'ORAICH',
  coinSymbol: 'ORAICH',
  capabilities: ORAICHAIN_CAPABILITIES,
  createNetwork: createOraichainNetwork
}

