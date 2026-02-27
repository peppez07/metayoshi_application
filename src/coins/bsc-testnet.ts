import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import bnbLogo from './coinlogos/bnb.webp'

export const BSCTESTNET_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: true, assetSend: true, activity: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
}

export function createBscTestnetNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--bsc-testnet',
    runtimeModelId: 'bnb',
    serverCoinId: 'bsc-testnet',
    serverChain: 'main',
    name: 'Bsc Testnet',
    symbol: 'BSCTES',
    coinType: 'EVM',
    coinSymbol: 'BSCTES',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('bsc-testnet', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: BSCTESTNET_CAPABILITIES,
    derivation: { status: 'supported' },    logo: bnbLogo
  }
}

export const bscTestnetCoin: CoinModule = {
  id: 'srv--bsc-testnet',
  symbol: 'BSCTES',
  coinSymbol: 'BSCTES',
  capabilities: BSCTESTNET_CAPABILITIES,
  createNetwork: createBscTestnetNetwork
}

