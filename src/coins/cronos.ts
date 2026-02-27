import type { CoinModule, CoinRuntimeContext, Network, NetworkCapabilitiesInput } from './types'
import croLogo from './coinlogos/cro.png'

export const CRO_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: true, assetSend: true, activity: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
}

export function createCroNetwork(ctx: CoinRuntimeContext): Network {
  return {
    id: 'cro',
    name: 'Cronos',
    symbol: 'CRO',
    coinType: 'EVM',
    coinSymbol: 'CRO',
    chainId: 25,
    rpcUrl: import.meta.env.VITE_CRO_RPC || 'https://evm.cronos.org',
    rpcWallet: '',
    rpcUsername: import.meta.env.VITE_CRO_RPC_USER || '',
    rpcPassword: import.meta.env.VITE_CRO_RPC_PASSWORD || '',
    bridgeUrl: import.meta.env.VITE_CRO_BRIDGE_URL || ctx.buildBridgeUrl('cronos', 'main'),
    bridgeUsername: import.meta.env.VITE_CRO_BRIDGE_USER || 'bridgeuser',
    bridgePassword: import.meta.env.VITE_CRO_BRIDGE_PASSWORD || 'bridgepass',
    explorerUrl: import.meta.env.VITE_CRO_EXPLORER || 'https://cronoscan.com',
    capabilities: CRO_CAPABILITIES,
    logo: croLogo
  }
}

export const croCoin: CoinModule = {
  id: 'cro',
  symbol: 'CRO',
  coinSymbol: 'CRO',
  capabilities: CRO_CAPABILITIES,
  createNetwork: createCroNetwork
}

