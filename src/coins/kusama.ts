import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const KUSAMA_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createKusamaNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--kusama',
    runtimeModelId: 'utxo',
    serverCoinId: 'kusama',
    serverChain: 'main',
    name: 'Kusama',
    symbol: 'KUSAMA',
    coinType: 'UTXO',
    coinSymbol: 'KUSAMA',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('kusama', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: KUSAMA_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'kusama address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const kusamaCoin: CoinModule = {
  id: 'srv--kusama',
  symbol: 'KUSAMA',
  coinSymbol: 'KUSAMA',
  capabilities: KUSAMA_CAPABILITIES,
  createNetwork: createKusamaNetwork
}

