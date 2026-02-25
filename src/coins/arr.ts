import type {
  CoinModule,
  CoinRuntimeContext,
  Network,
  NetworkCapabilitiesInput,
  UtxoAddressSpec
} from './types'
import { ARR_API_INFO } from './interceptors'
import arrLogo from './coinlogos/Pirate_Chain.webp'

export const ARR_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export const ARR_ADDRESS_SPEC: UtxoAddressSpec = {
  // Pirate Chain shares Komodo-style transparent prefixes and BIP44 coin type.
  bip44CoinType: 141,
  p2pkhVersion: 0x3c
}

export const ARR_FEE_PER_BYTE = 0.00002

export function estimateArrFee(txBytes: number): number {
  return txBytes * ARR_FEE_PER_BYTE
}

export function createArrNetwork(ctx: CoinRuntimeContext): Network {
  void ctx
  return {
    id: 'arr',
    name: 'Pirate Chain',
    symbol: 'ARRR',
    coinType: 'UTXO',
    coinSymbol: 'ARRR',
    rpcUrl: import.meta.env.VITE_ARR_RPC || ARR_API_INFO.defaultRpcUrl,
    rpcUsername: 'rpcuser',
    rpcPassword: 'rpcpass',
    bridgeUrl: import.meta.env.VITE_ARR_BRIDGE_URL || ARR_API_INFO.defaultBridgeUrl,
    explorerUrl: import.meta.env.VITE_ARR_EXPLORER || ARR_API_INFO.defaultExplorerUrl || 'https://arrr.explorer.dexstats.info',
    capabilities: ARR_CAPABILITIES,
    feePerByte: ARR_FEE_PER_BYTE,
    logo: arrLogo
  }
}

export const arrCoin: CoinModule = {
  id: 'arr',
  symbol: 'ARRR',
  coinSymbol: 'ARRR',
  capabilities: ARR_CAPABILITIES,
  utxoAddress: ARR_ADDRESS_SPEC,
  createNetwork: createArrNetwork,
  estimateFee: estimateArrFee
}

