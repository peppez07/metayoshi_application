import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import ethLogo from './coinlogos/ethereum.webp'

export const EVMOSTESTNETEVM_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: true, assetSend: true, activity: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
}

export function createEvmosTestnetEvmNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--evmos-testnet-evm',
    runtimeModelId: 'eth',
    serverCoinId: 'evmos-testnet-evm',
    serverChain: 'main',
    name: 'Evmos Testnet Evm',
    symbol: 'EVMOST',
    coinType: 'EVM',
    coinSymbol: 'EVMOST',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('evmos-testnet-evm', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: EVMOSTESTNETEVM_CAPABILITIES,
    derivation: { status: 'supported' },    logo: ethLogo
  }
}

export const evmosTestnetEvmCoin: CoinModule = {
  id: 'srv--evmos-testnet-evm',
  symbol: 'EVMOST',
  coinSymbol: 'EVMOST',
  capabilities: EVMOSTESTNETEVM_CAPABILITIES,
  createNetwork: createEvmosTestnetEvmNetwork
}

