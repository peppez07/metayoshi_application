import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import ethLogo from './coinlogos/ethereum.webp'

export const ETHEREUMSEPOLIA_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: true, assetSend: true, activity: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
}

export function createEthereumSepoliaNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--ethereum-sepolia',
    runtimeModelId: 'eth',
    serverCoinId: 'ethereum-sepolia',
    serverChain: 'main',
    name: 'Ethereum Sepolia',
    symbol: 'ETHERE',
    coinType: 'EVM',
    coinSymbol: 'ETHERE',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('ethereum-sepolia', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: ETHEREUMSEPOLIA_CAPABILITIES,
    derivation: { status: 'supported' },    logo: ethLogo
  }
}

export const ethereumSepoliaCoin: CoinModule = {
  id: 'srv--ethereum-sepolia',
  symbol: 'ETHERE',
  coinSymbol: 'ETHERE',
  capabilities: ETHEREUMSEPOLIA_CAPABILITIES,
  createNetwork: createEthereumSepoliaNetwork
}

