import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const JUNO_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createJunoNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--juno',
    runtimeModelId: 'utxo',
    serverCoinId: 'juno',
    serverChain: 'main',
    name: 'Juno',
    symbol: 'JUNO',
    coinType: 'UTXO',
    coinSymbol: 'JUNO',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('juno', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: JUNO_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'juno address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const junoCoin: CoinModule = {
  id: 'srv--juno',
  symbol: 'JUNO',
  coinSymbol: 'JUNO',
  capabilities: JUNO_CAPABILITIES,
  createNetwork: createJunoNetwork
}

