import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/chihuahua-wtf.png'

export const CHIHUAHUA_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createChihuahuaNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--chihuahua',
    runtimeModelId: 'utxo',
    serverCoinId: 'chihuahua',
    serverChain: 'main',
    name: 'Chihuahua',
    symbol: 'CHIHUA',
    coinType: 'UTXO',
    coinSymbol: 'CHIHUA',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('chihuahua', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: CHIHUAHUA_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'chihuahua address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const chihuahuaCoin: CoinModule = {
  id: 'srv--chihuahua',
  symbol: 'CHIHUA',
  coinSymbol: 'CHIHUA',
  capabilities: CHIHUAHUA_CAPABILITIES,
  createNetwork: createChihuahuaNetwork
}

