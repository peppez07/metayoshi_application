import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const TERITORI_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createTeritoriNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--teritori',
    runtimeModelId: 'utxo',
    serverCoinId: 'teritori',
    serverChain: 'main',
    name: 'Teritori',
    symbol: 'TERITO',
    coinType: 'UTXO',
    coinSymbol: 'TERITO',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('teritori', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: TERITORI_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'teritori address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const teritoriCoin: CoinModule = {
  id: 'srv--teritori',
  symbol: 'TERITO',
  coinSymbol: 'TERITO',
  capabilities: TERITORI_CAPABILITIES,
  createNetwork: createTeritoriNetwork
}

