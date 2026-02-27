import type {
  CoinModule,
  CoinRuntimeContext,
  Network,
  NetworkCapabilitiesInput,
  UtxoAddressSpec
} from './types'
import { DOGE_API_INFO } from './interceptors'
import dogeLogo from './coinlogos/dogecoin.png'

export const DOGE_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: false, assetSend: false, activity: true },
  ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: true, showActivityTab: true }
}

export const DOGE_ADDRESS_SPEC: UtxoAddressSpec = {
  bip44CoinType: 3,
  p2pkhVersion: 0x1e
}

// Keep current global wallet behavior for UTXO fee estimation.
export const DOGE_FEE_PER_BYTE = 0.00002

export function estimateDogeFee(txBytes: number): number {
  return txBytes * DOGE_FEE_PER_BYTE
}

export function createDogeNetwork(ctx: CoinRuntimeContext): Network {
  return {
    id: 'doge',
    name: 'Dogecoin',
    symbol: 'DOGE',
    coinType: 'UTXO',
    coinSymbol: 'DOGE',
    rpcUrl: ctx.apiBaseUrl,
    rpcUsername: 'rpcuser',
    rpcPassword: 'rpcpass',
    bridgeUrl: ctx.buildBridgeUrl('dogecoin', 'main'),
    explorerUrl: import.meta.env.VITE_DOGE_EXPLORER || DOGE_API_INFO.defaultExplorerUrl || 'https://dogechain.info',
    capabilities: DOGE_CAPABILITIES,
    feePerByte: DOGE_FEE_PER_BYTE,
    logo: dogeLogo
  }
}

export const dogeCoin: CoinModule = {
  id: 'doge',
  symbol: 'DOGE',
  coinSymbol: 'DOGE',
  capabilities: DOGE_CAPABILITIES,
  utxoAddress: DOGE_ADDRESS_SPEC,
  createNetwork: createDogeNetwork,
  estimateFee: estimateDogeFee
}
