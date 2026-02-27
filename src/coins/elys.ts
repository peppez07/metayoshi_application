import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/elysia.png'

export const ELYS_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createElysNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--elys',
    runtimeModelId: 'utxo',
    serverCoinId: 'elys',
    serverChain: 'main',
    name: 'Elys',
    symbol: 'ELYS',
    coinType: 'UTXO',
    coinSymbol: 'ELYS',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('elys', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: ELYS_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'elys address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const elysCoin: CoinModule = {
  id: 'srv--elys',
  symbol: 'ELYS',
  coinSymbol: 'ELYS',
  capabilities: ELYS_CAPABILITIES,
  createNetwork: createElysNetwork
}

