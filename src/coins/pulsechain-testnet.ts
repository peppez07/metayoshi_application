import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import ethLogo from './coinlogos/ethereum.webp'

export const PULSECHAINTESTNET_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: true, assetSend: true, activity: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
}

export function createPulsechainTestnetNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--pulsechain-testnet',
    runtimeModelId: 'eth',
    serverCoinId: 'pulsechain-testnet',
    serverChain: 'main',
    name: 'Pulsechain Testnet',
    symbol: 'PULSEC',
    coinType: 'EVM',
    coinSymbol: 'PULSEC',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('pulsechain-testnet', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: PULSECHAINTESTNET_CAPABILITIES,
    derivation: { status: 'supported' },    logo: ethLogo
  }
}

export const pulsechainTestnetCoin: CoinModule = {
  id: 'srv--pulsechain-testnet',
  symbol: 'PULSEC',
  coinSymbol: 'PULSEC',
  capabilities: PULSECHAINTESTNET_CAPABILITIES,
  createNetwork: createPulsechainTestnetNetwork
}

