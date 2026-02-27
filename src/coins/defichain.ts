import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const DEFICHAIN_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createDefichainNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--defichain',
    runtimeModelId: 'utxo',
    serverCoinId: 'defichain',
    serverChain: 'main',
    name: 'Defichain',
    symbol: 'DEFICH',
    coinType: 'UTXO',
    coinSymbol: 'DEFICH',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('defichain', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: DEFICHAIN_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'defichain address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const defichainCoin: CoinModule = {
  id: 'srv--defichain',
  symbol: 'DEFICH',
  coinSymbol: 'DEFICH',
  capabilities: DEFICHAIN_CAPABILITIES,
  createNetwork: createDefichainNetwork
}

