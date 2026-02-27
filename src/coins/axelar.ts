import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/axelar.png'

export const AXELAR_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createAxelarNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--axelar',
    runtimeModelId: 'utxo',
    serverCoinId: 'axelar',
    serverChain: 'main',
    name: 'Axelar',
    symbol: 'AXELAR',
    coinType: 'UTXO',
    coinSymbol: 'AXELAR',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('axelar', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: AXELAR_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'axelar address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const axelarCoin: CoinModule = {
  id: 'srv--axelar',
  symbol: 'AXELAR',
  coinSymbol: 'AXELAR',
  capabilities: AXELAR_CAPABILITIES,
  createNetwork: createAxelarNetwork
}

