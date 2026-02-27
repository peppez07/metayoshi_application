import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/passage.png'

export const PASSAGE_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createPassageNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--passage',
    runtimeModelId: 'utxo',
    serverCoinId: 'passage',
    serverChain: 'main',
    name: 'Passage',
    symbol: 'PASSAG',
    coinType: 'UTXO',
    coinSymbol: 'PASSAG',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('passage', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: PASSAGE_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'passage address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const passageCoin: CoinModule = {
  id: 'srv--passage',
  symbol: 'PASSAG',
  coinSymbol: 'PASSAG',
  capabilities: PASSAGE_CAPABILITIES,
  createNetwork: createPassageNetwork
}

