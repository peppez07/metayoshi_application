import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import ethLogo from './coinlogos/ethereum.webp'

export const FRAXTALHOODI_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: true, assetSend: true, activity: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
}

export function createFraxtalHoodiNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--fraxtal-hoodi',
    runtimeModelId: 'eth',
    serverCoinId: 'fraxtal-hoodi',
    serverChain: 'main',
    name: 'Fraxtal Hoodi',
    symbol: 'FRAXTA',
    coinType: 'EVM',
    coinSymbol: 'FRAXTA',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('fraxtal-hoodi', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: FRAXTALHOODI_CAPABILITIES,
    derivation: { status: 'supported' },    logo: ethLogo
  }
}

export const fraxtalHoodiCoin: CoinModule = {
  id: 'srv--fraxtal-hoodi',
  symbol: 'FRAXTA',
  coinSymbol: 'FRAXTA',
  capabilities: FRAXTALHOODI_CAPABILITIES,
  createNetwork: createFraxtalHoodiNetwork
}

