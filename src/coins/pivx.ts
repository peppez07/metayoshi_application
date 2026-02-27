import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/pivx.png'

export const PIVX_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createPivxNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--pivx',
    runtimeModelId: 'utxo',
    serverCoinId: 'pivx',
    serverChain: 'main',
    name: 'Pivx',
    symbol: 'PIVX',
    coinType: 'UTXO',
    coinSymbol: 'PIVX',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('pivx', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: PIVX_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'pivx address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const pivxCoin: CoinModule = {
  id: 'srv--pivx',
  symbol: 'PIVX',
  coinSymbol: 'PIVX',
  capabilities: PIVX_CAPABILITIES,
  createNetwork: createPivxNetwork
}
