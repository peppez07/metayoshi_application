import { getBuildFeatureFlag } from '../buildConfig'
import type { Network } from '../coins/types'
import {
  createServerExecutionRpcConfig,
  fetchServerExecutionStatus,
  isTerminalServerExecutionStatus,
  requestServerSwapQuote,
  resolveServerSwapAssetDecimals,
  submitServerSwap,
  type ServerExecutionStatus,
  type ServerSponsorPreference,
  type ServerSwapAssetRef,
  type ServerSwapQuote,
  type ServerSwapQuoteRequest,
  type ServerSwapSubmitRequest
} from './serverExecution'
import { hasSwapMatrixRoute, isSwapMatrixSupportedNetworkId } from './swapSupportMatrix'

export type WalletSwapApiVersion = 'legacy' | 'v1'
export type WalletSwapRoutePreference = 'best-value' | 'fastest' | 'lowest-gas' | 'safest'
export type WalletSwapReadinessState = 'active' | 'planned' | 'unsupported'
export type WalletSwapReadinessTone = 'emerald' | 'amber' | 'slate'

export type WalletSwapReadiness = {
  state: WalletSwapReadinessState
  tone: WalletSwapReadinessTone
  engineLabel: string
  title: string
  detail: string
  canRequestQuotes: boolean
}

function readString(value: unknown): string {
  return String(value ?? '').trim()
}

export function getWalletSwapApiVersion(): WalletSwapApiVersion {
  const raw = readString((import.meta as any)?.env?.VITE_SWAP_API_VERSION).toLowerCase()
  return raw === 'v1' ? 'v1' : 'legacy'
}

export function isSolanaSwapPreviewEnabled(): boolean {
  return getBuildFeatureFlag('swapSolanaV1Enabled', 'VITE_SWAP_ENABLE_SOLANA_V1', false)
}

export function resolveWalletSwapReadiness(
  fromNetwork?: Pick<Network, 'coinType' | 'id' | 'name'> | null,
  toNetwork?: Pick<Network, 'coinType' | 'id' | 'name'> | null,
  fromAssetSymbol?: string | null,
  toAssetSymbol?: string | null
): WalletSwapReadiness {
  if (!fromNetwork || !toNetwork) {
    return {
      state: 'unsupported',
      tone: 'slate',
      engineLabel: 'Select networks',
      title: 'Choose networks to see swap readiness',
      detail: 'MetaYoshi enables swap routes per chain pair and execution model.',
      canRequestQuotes: false
    }
  }

  if (!isSwapMatrixSupportedNetworkId(fromNetwork.id) || !isSwapMatrixSupportedNetworkId(toNetwork.id)) {
    return {
      state: 'unsupported',
      tone: 'slate',
      engineLabel: 'Not supported',
      title: 'This pair is outside the current swap scope',
      detail: 'Only the live matrix networks are enabled in the current wallet swap build.',
      canRequestQuotes: false
    }
  }

  const sameChain = fromNetwork.id === toNetwork.id
  const version = getWalletSwapApiVersion()
  const routeIsLive = hasSwapMatrixRoute(fromNetwork.id, fromAssetSymbol, toNetwork.id, toAssetSymbol)
  const networkPairIsLive = hasSwapMatrixRoute(fromNetwork.id, undefined, toNetwork.id, undefined)

  if (routeIsLive && fromNetwork.coinType === 'SOL' && toNetwork.coinType === 'SOL' && sameChain) {
    return {
      state: 'active',
      tone: 'emerald',
      engineLabel: 'Jupiter Solana routing',
      title: 'Same-chain Solana swaps are available',
      detail: 'Quotes, signing payloads, and submit flow follow the live Jupiter-backed server contract.',
      canRequestQuotes: true
    }
  }

  if (routeIsLive && fromNetwork.coinType === 'EVM' && toNetwork.coinType === 'EVM' && sameChain) {
    return {
      state: 'active',
      tone: 'emerald',
      engineLabel: version === 'v1' ? 'V1 EVM routing' : 'Live EVM routing',
      title: 'Same-chain EVM swaps are available',
      detail: 'Quotes come from the MetaYoshi server and transactions stay locally signed in the wallet.',
      canRequestQuotes: true
    }
  }

  if (routeIsLive && fromNetwork.coinType === 'EVM' && toNetwork.coinType === 'EVM' && !sameChain) {
    return {
      state: 'active',
      tone: 'emerald',
      engineLabel: 'Sponsored internal routing',
      title: 'Cross-chain EVM routes are available',
      detail: 'The current matrix allows the live deterministic ETH, WETH, and USDC routes between Ethereum, Base, Arbitrum, and Optimism.',
      canRequestQuotes: true
    }
  }

  if (networkPairIsLive) {
    return {
      state: 'unsupported',
      tone: 'slate',
      engineLabel: 'Pair not in matrix',
      title: 'Choose one of the live matrix asset pairs',
      detail: 'The selected networks are enabled, but this asset combination is not part of the current live support matrix.',
      canRequestQuotes: false
    }
  }

  return {
    state: 'unsupported',
    tone: 'slate',
    engineLabel: 'Not supported',
    title: 'This pair is outside the current swap scope',
    detail: 'The current wallet build is scoped to EVM same-chain swaps first, with Solana and controlled cross-chain routes next.',
    canRequestQuotes: false
  }
}

export {
  createServerExecutionRpcConfig,
  fetchServerExecutionStatus,
  isTerminalServerExecutionStatus,
  requestServerSwapQuote,
  resolveServerSwapAssetDecimals,
  submitServerSwap
}

export type {
  ServerExecutionStatus,
  ServerSponsorPreference,
  ServerSwapAssetRef,
  ServerSwapQuote,
  ServerSwapQuoteRequest,
  ServerSwapSubmitRequest
}
