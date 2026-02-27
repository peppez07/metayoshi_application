import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const BITCOINTESTNET_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createBitcoinTestnetNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--bitcoin-testnet',
    runtimeModelId: 'utxo',
    serverCoinId: 'bitcoin-testnet',
    serverChain: 'main',
    name: 'Bitcoin Testnet',
    symbol: 'BTC',
    coinType: 'UTXO',
    coinSymbol: 'BTC',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('bitcoin-testnet', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: BITCOINTESTNET_CAPABILITIES,
    derivation: { status: 'supported' },
    logo: utxoLogo
  }
}

export const bitcoinTestnetCoin: CoinModule = {
  id: 'srv--bitcoin-testnet',
  symbol: 'BTC',
  coinSymbol: 'BTC',
  capabilities: BITCOINTESTNET_CAPABILITIES,
  createNetwork: createBitcoinTestnetNetwork
}

