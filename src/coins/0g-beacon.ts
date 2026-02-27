import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import utxoLogo from './coinlogos/btcz.webp'

export const C0GBEACON_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export function createC0gBeaconNetwork(ctx: CoinRuntimeContext): Network {
  const bridgeUser = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
  const bridgePass = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'
  return {
    id: 'srv--0g-beacon',
    runtimeModelId: 'utxo',
    serverCoinId: '0g-beacon',
    serverChain: 'main',
    name: '0G Beacon',
    symbol: '0GBEAC',
    coinType: 'UTXO',
    coinSymbol: '0GBEAC',
    rpcUrl: ctx.apiBaseUrl,
    rpcWallet: '',
    rpcUsername: '',
    rpcPassword: '',
    bridgeUrl: ctx.buildBridgeUrl('0g-beacon', 'main'),
    bridgeUsername: bridgeUser,
    bridgePassword: bridgePass,
    capabilities: C0GBEACON_CAPABILITIES,
    derivation: {
      status: 'unsupported',
      reason: '0g-beacon address derivation is not supported in this build'
    },    logo: utxoLogo
  }
}

export const c0gBeaconCoin: CoinModule = {
  id: 'srv--0g-beacon',
  symbol: '0GBEAC',
  coinSymbol: '0GBEAC',
  capabilities: C0GBEACON_CAPABILITIES,
  createNetwork: createC0gBeaconNetwork
}

