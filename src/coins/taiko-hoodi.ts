import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import ethLogo from './coinlogos/ethereum.webp'

export const TAIKOHOODI_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: true, assetSend: true, activity: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
}

export function createTaikoHoodiNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--taiko-hoodi',
    runtimeModelId: 'eth',
    serverCoinId: 'taiko-hoodi',
    serverChain: 'main',
    name: 'Taiko Hoodi',
    symbol: 'TAIKOH',
    coinType: 'EVM',
    coinSymbol: 'TAIKOH',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('taiko-hoodi', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: TAIKOHOODI_CAPABILITIES,
    derivation: { status: 'supported' },    logo: ethLogo
  }
}

export const taikoHoodiCoin: CoinModule = {
  id: 'srv--taiko-hoodi',
  symbol: 'TAIKOH',
  coinSymbol: 'TAIKOH',
  capabilities: TAIKOHOODI_CAPABILITIES,
  createNetwork: createTaikoHoodiNetwork
}

