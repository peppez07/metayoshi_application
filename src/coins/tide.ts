import type {
  CoinModule,
  CoinRuntimeContext,
  Network,
  NetworkCapabilitiesInput,
  UtxoAddressSpec
} from './types'
import { TIDE_API_INFO } from './interceptors'
import tideLogo from './coinlogos/tide.webp'

export const TIDE_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export const TIDE_ADDRESS_SPEC: UtxoAddressSpec = {
  // Tide uses Bitcoin-style BIP44 coin type 0 on mainnet.
  bip44CoinType: 0,
  p2pkhVersion: 0x21
}

export const TIDE_FEE_PER_BYTE = 0.00002

export function estimateTideFee(txBytes: number): number {
  return txBytes * TIDE_FEE_PER_BYTE
}

export function createTideNetwork(ctx: CoinRuntimeContext): Network {
  void ctx
  return {
    id: 'tide',
    name: 'Tidecoin',
    symbol: 'TIDE',
    coinType: 'UTXO',
    coinSymbol: 'TIDE',
    rpcUrl: import.meta.env.VITE_TIDE_RPC || TIDE_API_INFO.defaultRpcUrl,
    rpcUsername: 'rpcuser',
    rpcPassword: 'rpcpass',
    bridgeUrl: import.meta.env.VITE_TIDE_BRIDGE_URL || TIDE_API_INFO.defaultBridgeUrl,
    explorerUrl: import.meta.env.VITE_TIDE_EXPLORER || TIDE_API_INFO.defaultExplorerUrl || '',
    capabilities: TIDE_CAPABILITIES,
    feePerByte: TIDE_FEE_PER_BYTE,
    logo: tideLogo
  }
}

export const tideCoin: CoinModule = {
  id: 'tide',
  symbol: 'TIDE',
  coinSymbol: 'TIDE',
  capabilities: TIDE_CAPABILITIES,
  utxoAddress: TIDE_ADDRESS_SPEC,
  createNetwork: createTideNetwork,
  estimateFee: estimateTideFee
}
