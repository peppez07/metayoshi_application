import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const ELYSTESTNET_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createElysTestnetNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--elys-testnet',
    runtimeModelId: 'utxo',
    serverCoinId: 'elys-testnet',
    serverChain: 'main',
    name: 'Elys Testnet',
    symbol: 'ELYSTE',
    coinType: 'UTXO',
    coinSymbol: 'ELYSTE',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('elys-testnet', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: ELYSTESTNET_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'elys-testnet address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const elysTestnetCoin: CoinModule = {
  id: 'srv--elys-testnet',
  symbol: 'ELYSTE',
  coinSymbol: 'ELYSTE',
  capabilities: ELYSTESTNET_CAPABILITIES,
  createNetwork: createElysTestnetNetwork
}

