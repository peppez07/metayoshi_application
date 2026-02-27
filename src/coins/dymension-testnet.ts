import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const DYMENSIONTESTNET_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createDymensionTestnetNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--dymension-testnet',
    runtimeModelId: 'utxo',
    serverCoinId: 'dymension-testnet',
    serverChain: 'main',
    name: 'Dymension Testnet',
    symbol: 'DYMENS',
    coinType: 'UTXO',
    coinSymbol: 'DYMENS',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('dymension-testnet', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: DYMENSIONTESTNET_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'dymension-testnet address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const dymensionTestnetCoin: CoinModule = {
  id: 'srv--dymension-testnet',
  symbol: 'DYMENS',
  coinSymbol: 'DYMENS',
  capabilities: DYMENSIONTESTNET_CAPABILITIES,
  createNetwork: createDymensionTestnetNetwork
}

