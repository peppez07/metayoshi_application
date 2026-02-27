import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const REBUS_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createRebusNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--rebus',
    runtimeModelId: 'utxo',
    serverCoinId: 'rebus',
    serverChain: 'main',
    name: 'Rebus',
    symbol: 'REBUS',
    coinType: 'UTXO',
    coinSymbol: 'REBUS',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('rebus', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: REBUS_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'rebus address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const rebusCoin: CoinModule = {
  id: 'srv--rebus',
  symbol: 'REBUS',
  coinSymbol: 'REBUS',
  capabilities: REBUS_CAPABILITIES,
  createNetwork: createRebusNetwork
}

