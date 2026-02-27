import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import bnbLogo from './coinlogos/bnb.webp'

export const OPBNBTESTNET_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: true, assetSend: true, activity: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
}

export function createOpbnbTestnetNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--opbnb-testnet',
    runtimeModelId: 'bnb',
    serverCoinId: 'opbnb-testnet',
    serverChain: 'main',
    name: 'Opbnb Testnet',
    symbol: 'OPBNBT',
    coinType: 'EVM',
    coinSymbol: 'OPBNBT',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('opbnb-testnet', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: OPBNBTESTNET_CAPABILITIES,
    derivation: { status: 'supported' },    logo: bnbLogo
  }
}

export const opbnbTestnetCoin: CoinModule = {
  id: 'srv--opbnb-testnet',
  symbol: 'OPBNBT',
  coinSymbol: 'OPBNBT',
  capabilities: OPBNBTESTNET_CAPABILITIES,
  createNetwork: createOpbnbTestnetNetwork
}

