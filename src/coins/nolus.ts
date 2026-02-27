import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/nolus-io.png'

export const NOLUS_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createNolusNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--nolus',
    runtimeModelId: 'utxo',
    serverCoinId: 'nolus',
    serverChain: 'main',
    name: 'Nolus',
    symbol: 'NOLUS',
    coinType: 'UTXO',
    coinSymbol: 'NOLUS',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('nolus', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: NOLUS_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'nolus address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const nolusCoin: CoinModule = {
  id: 'srv--nolus',
  symbol: 'NOLUS',
  coinSymbol: 'NOLUS',
  capabilities: NOLUS_CAPABILITIES,
  createNetwork: createNolusNetwork
}

