import type {
  CoinModule,
  CoinRuntimeContext,
  Network,
  NetworkCapabilitiesInput,
  UtxoAddressSpec
} from './types'
import { RTM_API_INFO } from './interceptors'
import rtmLogo from './coinlogos/rtm.webp'

export const RTM_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: true, assetSend: true, activity: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
}

export const RTM_ADDRESS_SPEC: UtxoAddressSpec = {
  bip44CoinType: 175,
  p2pkhVersion: 0x3c
}

// RTM relay fee baseline is ~0.0001 RTM/kB. We keep a conservative margin.
export const RTM_FEE_PER_BYTE = 0.00002

export function estimateRtmFee(txBytes: number): number {
  return txBytes * RTM_FEE_PER_BYTE
}

export function createRtmNetwork(ctx: CoinRuntimeContext): Network {
  void ctx
  const wallet = import.meta.env.VITE_RTM_WALLET || RTM_API_INFO.defaultWallet || 'mainwallet'
  const bridgeDefault = RTM_API_INFO.defaultBridgeUrl
  return {
    id: 'rtm',
    name: 'Raptoreum',
    symbol: 'RTM',
    coinType: 'UTXO',
    coinSymbol: 'RTM',
    rpcUrl: import.meta.env.VITE_RTM_RPC || RTM_API_INFO.defaultRpcUrl,
    rpcWallet: wallet,
    rpcUsername: 'rpcuser',
    rpcPassword: 'rpcpass',
    bridgeUrl: import.meta.env.VITE_RTM_BRIDGE_URL || bridgeDefault,
    explorerUrl: import.meta.env.VITE_RTM_EXPLORER || RTM_API_INFO.defaultExplorerUrl || 'https://explorer.raptoreum.com',
    capabilities: RTM_CAPABILITIES,
    feePerByte: RTM_FEE_PER_BYTE,
    logo: rtmLogo
  }
}

export const rtmCoin: CoinModule = {
  id: 'rtm',
  symbol: 'RTM',
  coinSymbol: 'RTM',
  capabilities: RTM_CAPABILITIES,
  utxoAddress: RTM_ADDRESS_SPEC,
  createNetwork: createRtmNetwork,
  estimateFee: estimateRtmFee
}
