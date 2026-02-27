import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/bitcoin.webp'

export const BITCOIN_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createBitcoinNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--bitcoin',
    runtimeModelId: 'utxo',
    serverCoinId: 'bitcoin',
    serverChain: 'main',
    name: 'Bitcoin',
    symbol: 'BTC',
    coinType: 'UTXO',
    coinSymbol: 'BTC',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('bitcoin', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: BITCOIN_CAPABILITIES,
    derivation: { status: 'supported' },
    logo: utxoLogo
  }
}

export const bitcoinCoin: CoinModule = {
  id: 'srv--bitcoin',
  symbol: 'BTC',
  coinSymbol: 'BTC',
  capabilities: BITCOIN_CAPABILITIES,
  createNetwork: createBitcoinNetwork
}

