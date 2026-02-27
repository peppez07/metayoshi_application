import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/atomone.png'

export const ATOMONE_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createAtomoneNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--atomone',
    runtimeModelId: 'utxo',
    serverCoinId: 'atomone',
    serverChain: 'main',
    name: 'Atomone',
    symbol: 'ATOMON',
    coinType: 'UTXO',
    coinSymbol: 'ATOMON',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('atomone', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: ATOMONE_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: 'atomone address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const atomoneCoin: CoinModule = {
  id: 'srv--atomone',
  symbol: 'ATOMON',
  coinSymbol: 'ATOMON',
  capabilities: ATOMONE_CAPABILITIES,
  createNetwork: createAtomoneNetwork
}

