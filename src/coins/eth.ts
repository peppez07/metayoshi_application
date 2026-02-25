import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import ethereumLogo from './coinlogos/ethereum.webp'

export const ETH_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: true, assetSend: false, activity: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
}

export function createEthNetwork(ctx: CoinRuntimeContext): Network {
  return {
    id: 'eth',
    name: 'Ethereum',
    symbol: 'ETH',
    coinType: 'EVM',
    coinSymbol: 'ETH',
    chainId: 1,
    rpcUrl: import.meta.env.VITE_ETH_RPC || 'https://ethereum-rpc.publicnode.com',
    rpcWallet: '',
    rpcUsername: import.meta.env.VITE_ETH_RPC_USER || '',
    rpcPassword: import.meta.env.VITE_ETH_RPC_PASSWORD || '',
    bridgeUrl: import.meta.env.VITE_ETH_BRIDGE_URL || ctx.buildBridgeUrl('ethereum', 'main'),
    bridgeUsername: import.meta.env.VITE_ETH_BRIDGE_USER || 'bridgeuser',
    bridgePassword: import.meta.env.VITE_ETH_BRIDGE_PASSWORD || 'bridgepass',
    explorerUrl: import.meta.env.VITE_ETH_EXPLORER || 'https://etherscan.io',
    capabilities: ETH_CAPABILITIES,
    logo: ethereumLogo
  }
}

export const ethCoin: CoinModule = {
  id: 'eth',
  symbol: 'ETH',
  coinSymbol: 'ETH',
  capabilities: ETH_CAPABILITIES,
  createNetwork: createEthNetwork
}
