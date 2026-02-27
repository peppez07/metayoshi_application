import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/osmosis.png'

export const OSMOSIS_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createOsmosisNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--osmosis',
    runtimeModelId: 'utxo',
    serverCoinId: 'osmosis',
    serverChain: 'main',
    name: 'Osmosis',
    symbol: 'OSMOSI',
    coinType: 'UTXO',
    coinSymbol: 'OSMOSI',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('osmosis', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: OSMOSIS_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'osmosis address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const osmosisCoin: CoinModule = {
  id: 'srv--osmosis',
  symbol: 'OSMOSI',
  coinSymbol: 'OSMOSI',
  capabilities: OSMOSIS_CAPABILITIES,
  createNetwork: createOsmosisNetwork
}

