import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const SAGA_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createSagaNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--saga',
    runtimeModelId: 'utxo',
    serverCoinId: 'saga',
    serverChain: 'main',
    name: 'Saga',
    symbol: 'SAGA',
    coinType: 'UTXO',
    coinSymbol: 'SAGA',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('saga', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: SAGA_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'saga address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const sagaCoin: CoinModule = {
  id: 'srv--saga',
  symbol: 'SAGA',
  coinSymbol: 'SAGA',
  capabilities: SAGA_CAPABILITIES,
  createNetwork: createSagaNetwork
}

