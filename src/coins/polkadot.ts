import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/polkadot-new.png'

export const POLKADOT_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createPolkadotNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--polkadot',
    runtimeModelId: 'utxo',
    serverCoinId: 'polkadot',
    serverChain: 'main',
    name: 'Polkadot',
    symbol: 'POLKAD',
    coinType: 'UTXO',
    coinSymbol: 'POLKAD',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('polkadot', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: POLKADOT_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'polkadot address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const polkadotCoin: CoinModule = {
  id: 'srv--polkadot',
  symbol: 'POLKAD',
  coinSymbol: 'POLKAD',
  capabilities: POLKADOT_CAPABILITIES,
  createNetwork: createPolkadotNetwork
}

