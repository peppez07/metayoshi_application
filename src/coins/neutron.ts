import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const NEUTRON_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createNeutronNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--neutron',
    runtimeModelId: 'utxo',
    serverCoinId: 'neutron',
    serverChain: 'main',
    name: 'Neutron',
    symbol: 'NEUTRO',
    coinType: 'UTXO',
    coinSymbol: 'NEUTRO',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('neutron', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: NEUTRON_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'neutron address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const neutronCoin: CoinModule = {
  id: 'srv--neutron',
  symbol: 'NEUTRO',
  coinSymbol: 'NEUTRO',
  capabilities: NEUTRON_CAPABILITIES,
  createNetwork: createNeutronNetwork
}

