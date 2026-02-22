import type { NetworkCapabilitiesInput } from '../lib/networkCapabilities'
export type { NetworkCapabilitiesInput } from '../lib/networkCapabilities'

export type CoinType = 'EVM' | 'UTXO' | 'BTC' | 'SOL'

export interface Network {
  id: string
  name: string
  symbol: string
  coinType: CoinType
  chainId?: number

  // ── Local / direct RPC ──────────────────────────────────────────────────
  rpcUrl: string
  rpcWallet?: string
  rpcUsername?: string
  rpcPassword?: string

  // ── Public bridge gateway (*.metayoshi.app) ─────────────────────────────
  bridgeUrl?: string
  bridgeUsername?: string
  bridgePassword?: string

  explorerUrl?: string
  coinSymbol?: string
  supportsAssets?: boolean
  capabilities?: NetworkCapabilitiesInput
  /** Coin logo URL/path (public path or imported asset URL). */
  logo?: string

  // UTXO fee estimate in coin units per byte.
  feePerByte?: number
}

export interface UtxoAddressSpec {
  bip44CoinType: number
  p2pkhVersion: number | number[]
}

export interface CoinRuntimeContext {
  apiBaseUrl: string
  buildBridgeUrl: (coin: string, chain: 'main' | 'test', wallet?: string) => string
}

export interface CoinModule {
  id: string
  symbol: string
  coinSymbol?: string
  capabilities: NetworkCapabilitiesInput
  utxoAddress?: UtxoAddressSpec
  createNetwork: (ctx: CoinRuntimeContext) => Network
  estimateFee?: (txBytes: number) => number
}
