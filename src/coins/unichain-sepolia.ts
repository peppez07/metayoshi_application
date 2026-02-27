import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import baseLogo from './coinlogos/base.png'

export const UNICHAINSEPOLIA_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: true, assetSend: true, activity: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
}

export function createUnichainSepoliaNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--unichain-sepolia',
    runtimeModelId: 'base',
    serverCoinId: 'unichain-sepolia',
    serverChain: 'main',
    name: 'Unichain Sepolia',
    symbol: 'UNICHA',
    coinType: 'EVM',
    coinSymbol: 'UNICHA',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('unichain-sepolia', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: UNICHAINSEPOLIA_CAPABILITIES,
    derivation: { status: 'supported' },    logo: baseLogo
  }
}

export const unichainSepoliaCoin: CoinModule = {
  id: 'srv--unichain-sepolia',
  symbol: 'UNICHA',
  coinSymbol: 'UNICHA',
  capabilities: UNICHAINSEPOLIA_CAPABILITIES,
  createNetwork: createUnichainSepoliaNetwork
}

