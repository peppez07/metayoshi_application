import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import ethLogo from './coinlogos/ethereum.webp'

export const SONEIUMMINATO_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: true, assetSend: true, activity: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
}

export function createSoneiumMinatoNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--soneium-minato',
    runtimeModelId: 'eth',
    serverCoinId: 'soneium-minato',
    serverChain: 'main',
    name: 'Soneium Minato',
    symbol: 'SONEIU',
    coinType: 'EVM',
    coinSymbol: 'SONEIU',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('soneium-minato', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: SONEIUMMINATO_CAPABILITIES,
    derivation: { status: 'supported' },    logo: ethLogo
  }
}

export const soneiumMinatoCoin: CoinModule = {
  id: 'srv--soneium-minato',
  symbol: 'SONEIU',
  coinSymbol: 'SONEIU',
  capabilities: SONEIUMMINATO_CAPABILITIES,
  createNetwork: createSoneiumMinatoNetwork
}

