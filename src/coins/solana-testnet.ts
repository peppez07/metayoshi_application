import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import solLogo from './coinlogos/solana.webp'

export const SOLANATESTNET_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createSolanaTestnetNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--solana-testnet',
    runtimeModelId: 'sol',
    serverCoinId: 'solana-testnet',
    serverChain: 'main',
    name: 'Solana Testnet',
    symbol: 'SOLANA',
    coinType: 'SOL',
    coinSymbol: 'SOLANA',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('solana-testnet', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: SOLANATESTNET_CAPABILITIES,
    derivation: { status: 'supported' },    logo: solLogo
  }
}

export const solanaTestnetCoin: CoinModule = {
  id: 'srv--solana-testnet',
  symbol: 'SOLANA',
  coinSymbol: 'SOLANA',
  capabilities: SOLANATESTNET_CAPABILITIES,
  createNetwork: createSolanaTestnetNetwork
}

