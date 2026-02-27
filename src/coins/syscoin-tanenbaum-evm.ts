import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import ethLogo from './coinlogos/ethereum.webp'

export const SYSCOINTANENBAUMEVM_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: true, assetSend: true, activity: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
}

export function createSyscoinTanenbaumEvmNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--syscoin-tanenbaum-evm',
    runtimeModelId: 'eth',
    serverCoinId: 'syscoin-tanenbaum-evm',
    serverChain: 'main',
    name: 'Syscoin Tanenbaum Evm',
    symbol: 'SYSCOI',
    coinType: 'EVM',
    coinSymbol: 'SYSCOI',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('syscoin-tanenbaum-evm', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: SYSCOINTANENBAUMEVM_CAPABILITIES,
    derivation: { status: 'supported' },    logo: ethLogo
  }
}

export const syscoinTanenbaumEvmCoin: CoinModule = {
  id: 'srv--syscoin-tanenbaum-evm',
  symbol: 'SYSCOI',
  coinSymbol: 'SYSCOI',
  capabilities: SYSCOINTANENBAUMEVM_CAPABILITIES,
  createNetwork: createSyscoinTanenbaumEvmNetwork
}

