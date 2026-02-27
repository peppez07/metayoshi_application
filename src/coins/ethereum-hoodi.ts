import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import ethLogo from './coinlogos/ethereum.webp'

export const ETHEREUMHOODI_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: true, assetSend: true, activity: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
}

export function createEthereumHoodiNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--ethereum-hoodi',
    runtimeModelId: 'eth',
    serverCoinId: 'ethereum-hoodi',
    serverChain: 'main',
    name: 'Ethereum Hoodi',
    symbol: 'ETHERE',
    coinType: 'EVM',
    coinSymbol: 'ETHERE',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('ethereum-hoodi', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: ETHEREUMHOODI_CAPABILITIES,
    derivation: { status: 'supported' },    logo: ethLogo
  }
}

export const ethereumHoodiCoin: CoinModule = {
  id: 'srv--ethereum-hoodi',
  symbol: 'ETHERE',
  coinSymbol: 'ETHERE',
  capabilities: ETHEREUMHOODI_CAPABILITIES,
  createNetwork: createEthereumHoodiNetwork
}

