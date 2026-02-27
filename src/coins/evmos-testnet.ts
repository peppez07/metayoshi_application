import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const EVMOSTESTNET_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createEvmosTestnetNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--evmos-testnet',
    runtimeModelId: 'utxo',
    serverCoinId: 'evmos-testnet',
    serverChain: 'main',
    name: 'Evmos Testnet',
    symbol: 'EVMOST',
    coinType: 'UTXO',
    coinSymbol: 'EVMOST',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('evmos-testnet', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: EVMOSTESTNET_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'evmos-testnet address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const evmosTestnetCoin: CoinModule = {
  id: 'srv--evmos-testnet',
  symbol: 'EVMOST',
  coinSymbol: 'EVMOST',
  capabilities: EVMOSTESTNET_CAPABILITIES,
  createNetwork: createEvmosTestnetNetwork
}

