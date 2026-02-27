import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import ethLogo from './coinlogos/ethereum.webp'

export const SONICBLAZE_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: true, assetSend: true, activity: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
}

export function createSonicBlazeNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--sonic-blaze',
    runtimeModelId: 'eth',
    serverCoinId: 'sonic-blaze',
    serverChain: 'main',
    name: 'Sonic Blaze',
    symbol: 'SONICB',
    coinType: 'EVM',
    coinSymbol: 'SONICB',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('sonic-blaze', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: SONICBLAZE_CAPABILITIES,
    derivation: { status: 'supported' },    logo: ethLogo
  }
}

export const sonicBlazeCoin: CoinModule = {
  id: 'srv--sonic-blaze',
  symbol: 'SONICB',
  coinSymbol: 'SONICB',
  capabilities: SONICBLAZE_CAPABILITIES,
  createNetwork: createSonicBlazeNetwork
}

