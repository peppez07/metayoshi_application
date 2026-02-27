import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const ANALOG_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createAnalogNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--analog',
    runtimeModelId: 'utxo',
    serverCoinId: 'analog',
    serverChain: 'main',
    name: 'Analog',
    symbol: 'ANALOG',
    coinType: 'UTXO',
    coinSymbol: 'ANALOG',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('analog', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: ANALOG_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'analog address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const analogCoin: CoinModule = {
  id: 'srv--analog',
  symbol: 'ANALOG',
  coinSymbol: 'ANALOG',
  capabilities: ANALOG_CAPABILITIES,
  createNetwork: createAnalogNetwork
}

