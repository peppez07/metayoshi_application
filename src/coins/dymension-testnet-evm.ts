import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import ethLogo from './coinlogos/ethereum.webp'

export const DYMENSIONTESTNETEVM_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: true, assetSend: true, activity: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
}

export function createDymensionTestnetEvmNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--dymension-testnet-evm',
    runtimeModelId: 'eth',
    serverCoinId: 'dymension-testnet-evm',
    serverChain: 'main',
    name: 'Dymension Testnet Evm',
    symbol: 'DYMENS',
    coinType: 'EVM',
    coinSymbol: 'DYMENS',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('dymension-testnet-evm', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: DYMENSIONTESTNETEVM_CAPABILITIES,
    derivation: { status: 'supported' },    logo: ethLogo
  }
}

export const dymensionTestnetEvmCoin: CoinModule = {
  id: 'srv--dymension-testnet-evm',
  symbol: 'DYMENS',
  coinSymbol: 'DYMENS',
  capabilities: DYMENSIONTESTNETEVM_CAPABILITIES,
  createNetwork: createDymensionTestnetEvmNetwork
}

