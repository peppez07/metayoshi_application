import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/persistence.png'

export const PERSISTENCE_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createPersistenceNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--persistence',
    runtimeModelId: 'utxo',
    serverCoinId: 'persistence',
    serverChain: 'main',
    name: 'Persistence',
    symbol: 'PERSIS',
    coinType: 'UTXO',
    coinSymbol: 'PERSIS',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('persistence', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: PERSISTENCE_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'persistence address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const persistenceCoin: CoinModule = {
  id: 'srv--persistence',
  symbol: 'PERSIS',
  coinSymbol: 'PERSIS',
  capabilities: PERSISTENCE_CAPABILITIES,
  createNetwork: createPersistenceNetwork
}

