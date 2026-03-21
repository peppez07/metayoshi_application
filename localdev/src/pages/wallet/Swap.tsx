import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IoArrowBackOutline,
  IoChevronDownOutline,
  IoCloseOutline,
  IoLayersOutline,
  IoSearchOutline,
  IoSwapVerticalOutline,
  IoTimeOutline,
  IoTrendingUpOutline
} from 'react-icons/io5'
import { Button } from '../../components/Button'
import { useToast } from '../../components/Toast'
import type { Network } from '../../coins/types'
import { readCatalogTrackedEvmTokens } from '../../lib/catalogDb/repository'
import { signEvmTransaction, signSolanaTransaction } from '../../lib/dappSigning'
import { getEnabledNetworks } from '../../lib/networkVisibility'
import { isSwapSupportedNetwork } from '../../lib/swapEligibility'
import { getSolanaTokenRegistry } from '../../lib/solanaTokenRegistry'
import {
  createServerExecutionRpcConfig,
  fetchServerSwapChainPairs,
  fetchServerSwapMatrix,
  fetchServerExecutionStatus,
  isTerminalServerExecutionStatus,
  requestServerSwapQuote,
  resolveServerSwapAssetDecimals,
  resolveSwapServerNetworkId,
  searchServerSwapPairAssets,
  searchServerSwapAssets,
  submitServerSwap,
  type ServerSwapCatalogAsset,
  type ServerSwapChainPair,
  type ServerExecutionStatus,
  type ServerSponsorPreference,
  type ServerSwapAssetRef,
  type ServerSwapMatrixMarket,
  type ServerSwapQuote,
  type WalletSwapRoutePreference
} from '../../lib/swapClient'
import { getTokenLogoForAsset } from '../../coins/tokenlogos'
import {
  getBundledTrackedEvmTokens,
  useWalletStore,
  type EvmTrackedToken,
  type SendableItem
} from '../../store/walletStore'

function compactError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? 'Unknown error')
  return message.replace(/\s+/g, ' ').trim()
}

function readString(value: unknown): string {
  return String(value ?? '').trim()
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function parseJsonRecord(value: string): Record<string, unknown> {
  try {
    return asRecord(JSON.parse(value))
  } catch {
    return {}
  }
}

function normalizeEvmTransactionType(value: unknown): 2 | undefined {
  const normalized = readString(value).toLowerCase()
  return normalized === '2' || normalized === '0x2' ? 2 : undefined
}

function resolveProviderExecutionTransaction(
  providerExecution: Record<string, unknown>
): Parameters<typeof signEvmTransaction>[0]['tx'] | null {
  const directTransaction = asRecord(providerExecution.transaction)
  const unsignedTransaction = readString(providerExecution.unsignedTransaction)
  const fallbackTransaction = unsignedTransaction.startsWith('{') ? parseJsonRecord(unsignedTransaction) : {}
  const transaction = Object.keys(directTransaction).length > 0 ? directTransaction : fallbackTransaction
  if (Object.keys(transaction).length === 0) return null
  return {
    to: readString(transaction.to) || undefined,
    value: readString(transaction.value) || undefined,
    data: readString(transaction.data) || undefined,
    gasLimit: readString(transaction.gasLimit || transaction.gas) || undefined,
    gasPrice: readString(transaction.gasPrice) || undefined,
    maxFeePerGas: readString(transaction.maxFeePerGas) || undefined,
    maxPriorityFeePerGas: readString(transaction.maxPriorityFeePerGas) || undefined,
    nonce: readString(transaction.nonce) || undefined,
    chainId: readString(transaction.chainId) || undefined,
    type: normalizeEvmTransactionType(transaction.type)
  }
}

async function buildSignedProviderExecution(params: {
  quote: ServerSwapQuote
  sourceNetwork: Pick<Network, 'coinType'>
  mnemonic: string | null
  accountIndex: number
}): Promise<{ requestId?: string; signedTransaction: string } | undefined> {
  const providerExecution = asRecord(asRecord(params.quote.metadata).providerExecution)
  if (Object.keys(providerExecution).length === 0) return undefined
  const mnemonic = readString(params.mnemonic)
  if (!mnemonic) throw new Error('Wallet is locked')

  const requestId = readString(providerExecution.requestId) || undefined
  const signingScheme = readString(providerExecution.signingScheme).toLowerCase()
  const providerKind = readString(providerExecution.providerKind).toLowerCase()
  if (
    params.sourceNetwork.coinType === 'SOL'
    || signingScheme.includes('solana')
    || providerKind === 'jupiter'
  ) {
    const unsignedTransaction = readString(providerExecution.unsignedTransaction)
    if (!unsignedTransaction) {
      throw new Error('Swap quote is missing providerExecution.unsignedTransaction')
    }
    return {
      requestId,
      signedTransaction: await signSolanaTransaction({
        mnemonic,
        accountIndex: params.accountIndex,
        serializedTxBase64: unsignedTransaction
      })
    }
  }

  const transaction = resolveProviderExecutionTransaction(providerExecution)
  if (!transaction) {
    throw new Error('Swap quote is missing providerExecution.transaction')
  }
  return {
    requestId,
    signedTransaction: await signEvmTransaction({
      mnemonic,
      accountIndex: params.accountIndex,
      tx: transaction
    })
  }
}

function formatSwapUiError(error: unknown): string {
  const message = compactError(error)
  const normalized = message.toLowerCase()

  if (normalized.includes('vite_app_api_key is required')) {
    return 'Swap is not configured yet. Set VITE_APP_API_KEY for the server API and reload the wallet.'
  }

  if (
    normalized.includes('did not come from the metayoshi server swap service')
    || normalized.includes('only supports metayoshi server-managed swaps')
    || normalized.includes('metayoshi server swap service is unavailable')
  ) {
    return 'The MetaYoshi swap backend is not ready for this request yet. Retry in a moment or switch to a pair the server currently routes.'
  }

  if (
    normalized.includes('secure bridge signer is unavailable')
    || normalized.includes('wallet is locked')
  ) {
    return 'Unlock the wallet before requesting a swap quote.'
  }

  if (
    normalized.includes('secure bridge auth challenge failed')
    || normalized.includes('secure bridge auth verify failed')
    || normalized.includes('secure bridge signer address mismatch')
    || normalized.includes('secure bridge signer returned an invalid evm address')
  ) {
    return 'The wallet could not open a secure swap session with the server. Retry after reconnecting the wallet.'
  }

  if (normalized.includes('evm chainid is required') || normalized.includes('selected network is not evm')) {
    return 'This swap route is not available for the selected network pair.'
  }

  if (
    normalized.includes('no route')
    || normalized.includes('requested asset pair')
    || normalized.includes('selected swap')
  ) {
    return 'No swap route is available for this network and asset pair.'
  }

  if (
    normalized.includes('routing "')
    || normalized.includes('not supported by this swap flow')
  ) {
    return 'This quote returned an unsupported execution mode for the current wallet flow.'
  }

  if (normalized.includes('swap quote request failed')) {
    return 'Swap quote service is unavailable right now. Please try again in a moment.'
  }

  if (
    normalized.includes('providerexecution.')
    || normalized.includes('unsignedtransaction')
    || normalized.includes('signedtransaction')
  ) {
    return 'This quote is missing the wallet-signing payload required by the current swap backend. Request a fresh quote and try again.'
  }

  if (normalized.includes('server execution request failed')) {
    return 'Swap service is temporarily unavailable. Please try again in a moment.'
  }

  return message
}

function formatExpiry(expiresAt: number): string {
  const deltaMs = Math.max(0, expiresAt - Date.now())
  const seconds = Math.max(0, Math.round(deltaMs / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${minutes}m ${remainder}s`
}

function formatAssetLabel(item: SwapAssetOption | null, fallbackSymbol?: string): string {
  if (!item) return fallbackSymbol || 'Select asset'
  if (!item.label || item.label === item.symbol) return item.symbol
  return `${item.symbol} - ${item.label}`
}

function formatAssetSummaryLabel(item: SwapAssetOption | null, networkName?: string, fallbackSymbol?: string): string {
  const base = formatAssetLabel(item, fallbackSymbol)
  return networkName ? `${base} on ${networkName}` : base
}

type SwapAssetOption = {
  id: string
  source: 'wallet' | 'server'
  assetId: string
  kind: 'native' | 'fungible' | 'wrapped' | 'nft'
  symbol: string
  label: string
  contractAddress?: string
  logoUrl?: string
  amount?: string
  rawAmount?: number
}

type TokenSelectorSide = 'from' | 'to'
type AssetSelectorFilter = 'all' | 'tokens' | 'nfts'
type LiveServerAssetMetadata = {
  assetId: string
  kind: 'native' | 'fungible' | 'wrapped' | 'nft'
  symbol: string
  label: string
  contractAddress?: string
  logoUrl?: string
}
type LiveServerAssetIndex = {
  nativeAsset?: LiveServerAssetMetadata
  byAssetId: Map<string, LiveServerAssetMetadata>
  byContract: Map<string, LiveServerAssetMetadata>
}

type SwapCapabilityChain = {
  networkId: string
  name: string
  nativeSymbol: string
  supportsBalances: boolean
  supportsSend: boolean
  supportsSwap: boolean
  swapProviders: string[]
}

const POPULAR_SWAP_SYMBOLS = [
  'ETH',
  'WETH',
  'USDC',
  'USDT',
  'WBTC',
  'BTC',
  'DAI',
  'BNB',
  'AVAX',
  'POL',
  'MATIC',
  'ARB',
  'OP',
  'SOL',
  'CRO'
]
const SOLANA_SWAP_MINT_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

function normalizeContractAddress(value: unknown): string {
  const raw = String(value || '').trim().toLowerCase()
  return /^0x[a-f0-9]{40}$/.test(raw) ? raw : ''
}

function buildLiveServerAssetIndex(items: ServerSwapCatalogAsset[]): LiveServerAssetIndex {
  const byAssetId = new Map<string, LiveServerAssetMetadata>()
  const byContract = new Map<string, LiveServerAssetMetadata>()
  let nativeAsset: LiveServerAssetMetadata | undefined

  for (const item of items) {
    const assetId = String(item.assetId || '').trim()
    const symbol = String(item.symbol || '').trim()
    const label = String(item.label || item.symbol || '').trim() || symbol || 'Asset'
    const kind = item.kind === 'native' || item.kind === 'wrapped' || item.kind === 'nft' ? item.kind : 'fungible'
    const meta: LiveServerAssetMetadata = {
      assetId: assetId || `native:${String(item.networkId || '').trim()}`,
      kind,
      symbol: symbol || 'NATIVE',
      label,
      contractAddress: normalizeContractAddress(item.contractAddress) || undefined,
      logoUrl: getTokenLogoForAsset(symbol || label || assetId)
    }
    if (assetId) {
      byAssetId.set(assetId.toLowerCase(), meta)
    }
    if (kind === 'native') {
      nativeAsset = meta
      continue
    }

    const contractAddress = meta.contractAddress
    if (!contractAddress || byContract.has(contractAddress)) continue
    byContract.set(contractAddress, meta)
  }

  return { nativeAsset, byAssetId, byContract }
}

function createWalletAssetOptionWithServer(
  item: SendableItem,
  serverIndex?: LiveServerAssetIndex
): SwapAssetOption {
  const rawAssetId = String(item.assetId || item.id || '').trim()
  const exactMatch = rawAssetId ? serverIndex?.byAssetId.get(rawAssetId.toLowerCase()) : undefined
  const contractAddress = inferAssetContractAddress(item)
  const normalizedContract = normalizeContractAddress(contractAddress)
  const contractMatch = item.kind === 'nft'
    ? undefined
    : (normalizedContract ? serverIndex?.byContract.get(normalizedContract) : undefined)
  const serverMatch = item.kind === 'native'
    ? serverIndex?.nativeAsset
    : (exactMatch || contractMatch)
  const fallbackLogo = item.logoUrl || getTokenLogoForAsset(item.symbol || item.label || rawAssetId || item.id)

  return {
    id: item.id,
    source: 'wallet',
    assetId: String(serverMatch?.assetId || rawAssetId || item.id || '').trim() || item.id,
    kind: serverMatch?.kind || item.kind,
    symbol: serverMatch?.symbol || item.symbol,
    label: serverMatch?.label || item.label,
    contractAddress: contractAddress || serverMatch?.contractAddress,
    logoUrl: serverMatch?.logoUrl || fallbackLogo,
    amount: item.amount,
    rawAmount: item.rawAmount
  }
}

function createServerAssetOption(item: ServerSwapCatalogAsset): SwapAssetOption {
  const contractAddress = String(item.contractAddress || '').trim() || undefined
  return {
    id: `server:${String(item.networkId || '').trim()}:${String(item.assetId || '').trim()}`,
    source: 'server',
    assetId: String(item.assetId || '').trim(),
    kind: item.kind,
    symbol: item.symbol,
    label: item.label,
    contractAddress,
    logoUrl: item.logoUrl || getTokenLogoForAsset(item.symbol || item.label || item.assetId)
  }
}

function resolveSwapCatalogModelId(network: Pick<Network, 'id' | 'runtimeModelId'> | null | undefined): string {
  return String(network?.runtimeModelId || network?.id || '').trim().toLowerCase()
}

function buildTrackedEvmSwapAssetId(network: Pick<Network, 'id' | 'runtimeModelId'>, address: string): string {
  const modelId = resolveSwapCatalogModelId(network)
  return modelId ? `erc20:${modelId}:${address.toLowerCase()}` : address.toLowerCase()
}

function buildTrackedSolanaSwapAssetId(address: string): string {
  return `spl:solana:${String(address || '').trim()}`
}

function normalizeSwapCatalogContractReference(value: unknown): string {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const evm = normalizeContractAddress(raw)
  if (evm) return evm
  return SOLANA_SWAP_MINT_RE.test(raw) ? raw.toLowerCase() : ''
}

function mergeTrackedEvmAssetRows(...groups: EvmTrackedToken[][]): EvmTrackedToken[] {
  const out: EvmTrackedToken[] = []
  const seen = new Set<string>()

  for (const group of groups) {
    for (const item of group) {
      const address = normalizeContractAddress(item.address)
      if (!address || seen.has(address)) continue
      seen.add(address)
      out.push({
        ...item,
        address
      })
    }
  }

  return out
}

async function loadTrackedDestinationAssets(
  network: Pick<Network, 'id' | 'runtimeModelId' | 'coinType'> | null | undefined,
  query: string
): Promise<ServerSwapCatalogAsset[]> {
  const normalizedQuery = String(query || '').trim().toLowerCase()
  const out: ServerSwapCatalogAsset[] = []

  if (!network) return []

  if (network.coinType === 'EVM') {
    const modelId = resolveSwapCatalogModelId(network)
    if (!modelId) return []
    const tracked = mergeTrackedEvmAssetRows(
      await readCatalogTrackedEvmTokens(modelId).catch(() => []),
      getBundledTrackedEvmTokens(network)
    )

    for (const token of tracked) {
      const address = normalizeContractAddress(token.address)
      if (!address) continue
      const symbol = String(token.symbol || '').trim().toUpperCase() || address.slice(0, 6)
      const label = symbol
      if (normalizedQuery) {
        const haystack = `${symbol} ${label} ${address}`.toLowerCase()
        if (!haystack.includes(normalizedQuery)) continue
      }
      out.push({
        networkId: String(network.id || '').trim(),
        assetId: buildTrackedEvmSwapAssetId(network, address),
        symbol,
        label,
        kind: 'fungible',
        contractAddress: address,
        decimals: Number.isFinite(token.decimals) ? token.decimals : 18
      })
    }
  } else if (network.coinType === 'SOL') {
    // For swap receive-token search, allow the broader public Solana registry
    // when the server catalog is sparse so tokens like BONK still appear.
    const registry = await getSolanaTokenRegistry({ allowPublicRegistry: true }).catch(() => ({}))
    for (const token of Object.values(registry)) {
      const address = String(token.address || '').trim()
      if (!SOLANA_SWAP_MINT_RE.test(address)) continue
      const symbol = String(token.symbol || '').trim().toUpperCase() || address.slice(0, 6)
      const label = String(token.name || token.symbol || '').trim() || symbol
      if (normalizedQuery) {
        const haystack = `${symbol} ${label} ${address}`.toLowerCase()
        if (!haystack.includes(normalizedQuery)) continue
      }
      out.push({
        networkId: String(network.id || '').trim(),
        assetId: buildTrackedSolanaSwapAssetId(address),
        symbol,
        label,
        kind: 'fungible',
        contractAddress: address,
        logoUrl: String(token.logoURI || '').trim() || undefined,
        decimals: Number.isFinite(token.decimals) ? token.decimals : 0
      })
    }
  }

  return out.sort((left, right) => {
    const leftPopular = POPULAR_SWAP_SYMBOLS.includes(left.symbol.toUpperCase()) ? 1 : 0
    const rightPopular = POPULAR_SWAP_SYMBOLS.includes(right.symbol.toUpperCase()) ? 1 : 0
    if (leftPopular !== rightPopular) return rightPopular - leftPopular
    const leftLabel = String(left.label || left.symbol || '').trim()
    const rightLabel = String(right.label || right.symbol || '').trim()
    const labelCompare = leftLabel.localeCompare(rightLabel)
    if (labelCompare !== 0) return labelCompare
    return left.symbol.localeCompare(right.symbol)
  }).slice(0, normalizedQuery ? 1200 : 800)
}

function mergeServerAssetLists(...groups: ServerSwapCatalogAsset[][]): ServerSwapCatalogAsset[] {
  const out: ServerSwapCatalogAsset[] = []
  const seen = new Set<string>()

  for (const group of groups) {
    for (const item of group) {
      const networkId = String(item.networkId || '').trim().toLowerCase()
      const assetId = String(item.assetId || '').trim().toLowerCase()
      const contract = normalizeSwapCatalogContractReference(item.contractAddress)
      const identity = item.kind === 'native'
        ? `native:${networkId}:${assetId || item.symbol.toLowerCase()}`
        : (contract ? `contract:${networkId}:${contract}` : `asset:${networkId}:${assetId}`)
      if (!identity || seen.has(identity)) continue
      seen.add(identity)
      out.push(item)
    }
  }

  return out
}

function resolveAssetFamily(item: Pick<SwapAssetOption, 'kind'>): AssetSelectorFilter {
  return item.kind === 'nft' ? 'nfts' : 'tokens'
}

function filterAssetOptions(
  options: SwapAssetOption[],
  query: string,
  filter: AssetSelectorFilter = 'all'
): SwapAssetOption[] {
  const normalizedQuery = String(query || '').trim().toLowerCase()
  const familyFiltered = filter === 'all'
    ? options
    : options.filter((item) => resolveAssetFamily(item) === filter)
  if (!normalizedQuery) return familyFiltered

  return familyFiltered.filter((item) => {
    const symbol = String(item.symbol || '').trim().toLowerCase()
    const label = String(item.label || '').trim().toLowerCase()
    return symbol.includes(normalizedQuery) || label.includes(normalizedQuery)
  })
}

function inferAssetContractAddress(item: SendableItem): string | undefined {
  const raw = String(item.assetId || '').trim()
  if (!raw) return undefined
  const match = raw.match(/0x[a-fA-F0-9]{40}/)
  return match ? match[0] : undefined
}

function resolveSwapAssetIdentity(item: SwapAssetOption | null, networkId: string): string {
  if (!item) return ''
  if (item.kind === 'native') return `native:${networkId}`
  if (item.kind === 'nft') return String(item.assetId || item.id || '').trim().toLowerCase()
  const contractAddress = String(item.contractAddress || '').trim().toLowerCase()
  if (contractAddress) return contractAddress
  return String(item.assetId || item.id || '').trim().toLowerCase()
}

function toServerSwapAsset(item: SwapAssetOption | null, networkId: string): ServerSwapAssetRef | undefined {
  if (!item) return undefined
  const assetId = String(item.assetId || '').trim() || (item.kind === 'native' ? `native:${networkId}` : item.id)
  return {
    assetId,
    kind: item.kind,
    symbol: item.symbol,
    label: item.label,
    contractAddress: item.kind === 'native' ? undefined : (String(item.contractAddress || '').trim() || undefined)
  }
}

async function withResolvedSwapAsset(
  network: { coinType: string },
  rpcConfig: ReturnType<typeof createServerExecutionRpcConfig>,
  asset: ServerSwapAssetRef | undefined
): Promise<ServerSwapAssetRef | undefined> {
  if (!asset) return undefined
  if (network.coinType !== 'EVM' || asset.kind === 'native' || asset.kind === 'nft') return asset
  return {
    ...asset,
    decimals: await resolveServerSwapAssetDecimals(rpcConfig, asset)
  }
}

function formatDisplayAmount(value: string | number, maxDecimals = 6): string {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return String(value || '0')
  if (Math.abs(numeric) >= 1000) {
    return numeric.toLocaleString(undefined, { maximumFractionDigits: 2 })
  }
  return numeric.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals
  })
}

function formatQuoteRate(quote: ServerSwapQuote | null): string {
  if (!quote) return '--'
  const source = Number(quote.sourceAmount)
  const destination = Number(quote.destinationAmount)
  if (!Number.isFinite(source) || !Number.isFinite(destination) || source <= 0 || destination <= 0) return '--'
  return formatDisplayAmount(destination / source, 6)
}

function pickQuickAssets(
  options: SwapAssetOption[],
  network: Pick<Network, 'symbol' | 'id'> | null,
  selected: SwapAssetOption | null
): SwapAssetOption[] {
  const nativeSymbol = String(network?.symbol || '').trim().toUpperCase()
  const ranked = [...options].sort((left, right) => {
    const leftSymbol = String(left.symbol || '').trim().toUpperCase()
    const rightSymbol = String(right.symbol || '').trim().toUpperCase()
    const leftIndex = left.kind === 'native'
      ? -2
      : (leftSymbol === nativeSymbol ? -1 : POPULAR_SWAP_SYMBOLS.indexOf(leftSymbol))
    const rightIndex = right.kind === 'native'
      ? -2
      : (rightSymbol === nativeSymbol ? -1 : POPULAR_SWAP_SYMBOLS.indexOf(rightSymbol))
    const leftScore = leftIndex === -1 ? 999 : leftIndex
    const rightScore = rightIndex === -1 ? 999 : rightIndex
    if (leftScore !== rightScore) return leftScore - rightScore
    if (left.source !== right.source) return left.source === 'wallet' ? -1 : 1
    return leftSymbol.localeCompare(rightSymbol)
  })

  const out: SwapAssetOption[] = []
  const seen = new Set<string>()
  if (selected) {
    out.push(selected)
    seen.add(resolveSwapAssetIdentity(selected, network?.id || 'network'))
  }

  for (const item of ranked) {
    const identity = resolveSwapAssetIdentity(item, network?.id || 'network')
    if (seen.has(identity)) continue
    const symbol = String(item.symbol || '').trim().toUpperCase()
    const isPopular = item.kind === 'native' || symbol === nativeSymbol || POPULAR_SWAP_SYMBOLS.includes(symbol)
    if (!isPopular) continue
    out.push(item)
    seen.add(identity)
    if (out.length >= 6) break
  }

  return out
}

function countOptionsByFilter(options: SwapAssetOption[]) {
  const tokenCount = options.filter((item) => resolveAssetFamily(item) === 'tokens').length
  const nftCount = options.length - tokenCount
  return {
    all: options.length,
    tokens: tokenCount,
    nfts: nftCount
  }
}

function buildQuotePreviewKey(input: {
  amount: string
  fromNetworkId: string
  toNetworkId: string
  fromAssetId: string
  toAssetId: string
  slippagePct: string
  sponsorPreference: ServerSponsorPreference
  routePreference: WalletSwapRoutePreference
}): string {
  return [
    input.amount.trim(),
    input.fromNetworkId,
    input.toNetworkId,
    input.fromAssetId,
    input.toAssetId,
    input.slippagePct,
    input.sponsorPreference,
    input.routePreference
  ].join('|')
}

function matchesSwapChainPairNetwork(
  network: Pick<Network, 'id' | 'runtimeModelId' | 'chainId'> | null | undefined,
  pairNetworkId: string,
  pairChainId?: number
): boolean {
  if (!network) return false
  if (resolveSwapServerNetworkId(network) !== pairNetworkId) return false
  if (!Number.isFinite(pairChainId)) return true
  return Number(network.chainId) === Number(pairChainId)
}

function filterNetworksBySwapChainPairs(
  networks: Network[],
  pairs: ServerSwapChainPair[],
  side: 'source' | 'destination',
  selectedSource?: Pick<Network, 'id' | 'runtimeModelId' | 'chainId'> | null
): Network[] {
  if (pairs.length === 0) return networks
  const relevantPairs = side === 'destination' && selectedSource
    ? pairs.filter((pair) => matchesSwapChainPairNetwork(selectedSource, pair.sourceNetworkId, pair.sourceChainId))
    : pairs
  if (relevantPairs.length === 0) return networks

  const filtered = networks.filter((network) => relevantPairs.some((pair) => (
    side === 'source'
      ? matchesSwapChainPairNetwork(network, pair.sourceNetworkId, pair.sourceChainId)
      : matchesSwapChainPairNetwork(network, pair.destinationNetworkId, pair.destinationChainId)
  )))
  return filtered.length > 0 ? filtered : networks
}

function parseSwapCapabilityChains(payload: unknown): SwapCapabilityChain[] {
  const items = Array.isArray(asRecord(payload).items) ? asRecord(payload).items as unknown[] : []
  const out: SwapCapabilityChain[] = []
  const seen = new Set<string>()

  for (const row of items) {
    const item = asRecord(row)
    const networkId = String(
      item.chainKey
      || item.networkId
      || item.sourceNetworkId
      || item.destinationNetworkId
      || ''
    ).trim().toLowerCase()
    if (!networkId || seen.has(networkId)) continue
    seen.add(networkId)
    out.push({
      networkId,
      name: String(item.name || networkId).trim() || networkId,
      nativeSymbol: String(item.nativeSymbol || '').trim().toUpperCase(),
      supportsBalances: Boolean(item.supportsBalances),
      supportsSend: Boolean(item.supportsSend),
      supportsSwap: Boolean(item.supportsSwap),
      swapProviders: Array.isArray(item.swapProviders)
        ? item.swapProviders.map((entry) => String(entry || '').trim()).filter(Boolean)
        : []
    })
  }

  return out
}

function matchesSwapCatalogQuery(item: ServerSwapCatalogAsset, query: string): boolean {
  const normalized = String(query || '').trim().toLowerCase()
  if (!normalized) return true
  const haystack = [
    item.symbol,
    item.label,
    item.assetId,
    item.contractAddress,
    ...(Array.isArray(item.aliases) ? item.aliases : [])
  ].map((entry) => String(entry || '').trim().toLowerCase()).join(' ')
  return haystack.includes(normalized)
}

function DetailRow({ label, value, subdued = false }: { label: string; value: React.ReactNode; subdued?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[11px]">
      <span className={subdued ? 'text-slate-400' : 'text-slate-500'}>{label}</span>
      <span className="text-right font-semibold text-slate-900">{value}</span>
    </div>
  )
}

function formatSelectorAmount(option: SwapAssetOption): string {
  if (option.amount) return option.amount
  return option.kind === 'nft' ? 'NFT' : 'Route'
}

function AssetLogo({
  option,
  alt,
  className = 'h-9 w-9'
}: {
  option: SwapAssetOption
  alt: string
  className?: string
}) {
  if (option.logoUrl) {
    return (
      <img
        src={option.logoUrl}
        alt={alt}
        className={`${className} rounded-full object-cover`}
      />
    )
  }

  return (
    <div className={`flex items-center justify-center rounded-full bg-slate-900/5 text-slate-600 ${className}`}>
      <IoLayersOutline className="h-4 w-4" />
    </div>
  )
}

function AssetCompactTab({
  active,
  option,
  onClick,
  emphasis = 'default',
  contextLabel
}: {
  active: boolean
  option: SwapAssetOption
  onClick: () => void
  emphasis?: 'default' | 'soft'
  contextLabel?: string
}) {
  const amountText = formatSelectorAmount(option)

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-[134px] items-center gap-2.5 rounded-[18px] border px-3 py-2.5 text-left transition-colors ${
        active
          ? 'border-orange-300 bg-gradient-to-r from-[#ff9a4f] via-[#ff8129] to-[#ff6900] text-white shadow-[0_12px_24px_rgba(255,104,0,0.2)]'
          : emphasis === 'soft'
            ? 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
            : 'border-white/10 bg-white/5 text-slate-700 hover:border-white/20 hover:bg-white/10'
      }`}
    >
      <div className="shrink-0">
        <AssetLogo option={option} alt={`${option.symbol} logo`} className={`h-9 w-9 ${active ? 'ring-2 ring-white/20' : 'ring-1 ring-black/5'}`} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[11px] font-black uppercase tracking-[0.08em]">
            {option.symbol}
          </span>
          <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] ${
            active
              ? 'bg-white/12 text-white/80'
              : option.source === 'wallet'
                ? 'bg-slate-900/5 text-slate-400'
                : 'bg-emerald-500/10 text-emerald-500'
          }`}>
            {option.source === 'wallet' ? 'Wallet' : 'Route'}
          </span>
        </div>
        <div className={`mt-0.5 truncate text-[10px] ${active ? 'text-white/80' : 'text-slate-400'}`}>
          {option.label || option.symbol}
        </div>
        {contextLabel ? (
          <div className={`mt-0.5 truncate text-[9px] ${active ? 'text-white/72' : 'text-slate-400'}`}>
            On {contextLabel}
          </div>
        ) : null}
        <div className={`mt-1 text-[10px] font-semibold ${active ? 'text-white/88' : 'text-slate-500'}`}>
          {amountText}
        </div>
      </div>
    </button>
  )
}

function AssetListRowButton({
  active,
  option,
  onClick,
  contextLabel
}: {
  active: boolean
  option: SwapAssetOption
  onClick: () => void
  contextLabel?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-[20px] border px-3 py-3 text-left transition-colors ${
        active
          ? 'border-orange-300 bg-orange-50'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <AssetLogo option={option} alt={`${option.symbol} logo`} className="h-11 w-11" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-slate-900">{option.symbol}</span>
          <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] ${
            option.kind === 'nft'
              ? 'bg-fuchsia-500/10 text-fuchsia-500'
              : option.source === 'wallet'
                ? 'bg-slate-100 text-slate-500'
                : 'bg-emerald-500/10 text-emerald-600'
          }`}>
            {option.kind === 'nft' ? 'NFT' : option.source === 'wallet' ? 'Wallet' : 'Route'}
          </span>
        </div>
        <div className="mt-0.5 truncate text-[11px] text-slate-500">
          {option.label || option.symbol}
        </div>
        {contextLabel ? (
          <div className="mt-1 truncate text-[10px] font-medium text-slate-400">
            On {contextLabel}
          </div>
        ) : null}
      </div>
      <div className="text-right">
        <div className="text-[11px] font-semibold text-slate-700">{formatSelectorAmount(option)}</div>
        {active ? (
          <div className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-orange-500">Selected</div>
        ) : null}
      </div>
    </button>
  )
}

function SwapAssetButton({
  option,
  networkName,
  placeholder,
  onClick
}: {
  option: SwapAssetOption | null
  networkName?: string
  placeholder: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-w-[182px] rounded-[22px] border border-white/10 bg-white/5 px-3 py-3 transition-colors hover:border-white/20 hover:bg-white/10"
    >
      {option ? (
        <div className="flex items-center gap-3 text-left">
          <AssetLogo option={option} alt={`${option.symbol} logo`} className="h-10 w-10 ring-1 ring-black/5" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-900">{option.symbol}</div>
            <div className="mt-0.5 truncate text-[10px] text-slate-500">{option.label || placeholder}</div>
            <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
              <span className="truncate">{networkName || 'Network'}</span>
              <IoChevronDownOutline className="h-3.5 w-3.5 shrink-0" />
            </div>
          </div>
        </div>
      ) : (
        <div className="text-right">
          <div className="text-sm font-semibold text-slate-900">Select</div>
          <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-400">
            <span>{placeholder}</span>
            <IoChevronDownOutline className="h-3.5 w-3.5" />
          </div>
        </div>
      )}
    </button>
  )
}

function TokenSelectorModal({
  title,
  networkName,
  query,
  onQueryChange,
  quickPicks,
  options,
  selectedOptionId,
  filter,
  onFilterChange,
  emptyText,
  onSelect,
  onClose,
  optionContextLabel
}: {
  title: string
  networkName?: string
  query: string
  onQueryChange: (value: string) => void
  quickPicks: SwapAssetOption[]
  options: SwapAssetOption[]
  selectedOptionId?: string
  filter: AssetSelectorFilter
  onFilterChange: (value: AssetSelectorFilter) => void
  emptyText: string
  onSelect: (optionId: string) => void
  onClose: () => void
  optionContextLabel?: string
}) {
  const counts = useMemo(() => countOptionsByFilter(options), [options])
  const visibleOptions = useMemo(
    () => filterAssetOptions(options, query, filter).slice(0, 500),
    [options, query, filter]
  )
  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950/45 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="swap-dark-modal flex h-full w-full flex-col bg-[#f5f7fb]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              {networkName || 'Network'}
            </div>
            <div className="mt-1 text-base font-semibold text-slate-950">{title}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close token selector"
          >
            <IoCloseOutline className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="wallet-surface rounded-[28px] p-4">
            <div className="relative">
              <IoSearchOutline className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={`Search asset on ${networkName || 'this network'}`}
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                autoFocus
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {([
                { id: 'all', label: 'All', count: counts.all },
                { id: 'tokens', label: 'Tokens', count: counts.tokens },
                { id: 'nfts', label: 'NFTs', count: counts.nfts }
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onFilterChange(tab.id)}
                  className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] transition-colors ${
                    filter === tab.id
                      ? 'border-orange-300 bg-gradient-to-r from-[#ff9a4f] to-[#ff6900] text-white'
                      : 'border-white/10 bg-white/5 text-slate-500 hover:border-white/20 hover:text-slate-900'
                  }`}
                >
                  {tab.label} {tab.count > 0 ? `(${tab.count})` : ''}
                </button>
              ))}
            </div>

            {quickPicks.length > 0 ? (
              <div className="mt-4 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Quick picks</div>
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                  {quickPicks.map((item) => (
                    <AssetCompactTab
                      key={`selector-quick-${item.id}`}
                      active={item.id === selectedOptionId}
                      option={item}
                      emphasis="soft"
                      contextLabel={optionContextLabel}
                      onClick={() => onSelect(item.id)}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Asset list</div>
                <div className="text-[11px] text-slate-500">{visibleOptions.length} shown</div>
              </div>
              {visibleOptions.length > 0 ? (
                <div className="space-y-2">
                  {visibleOptions.map((item) => (
                    <AssetListRowButton
                      key={`selector-option-${item.id}`}
                      active={item.id === selectedOptionId}
                      option={item}
                      contextLabel={optionContextLabel}
                      onClick={() => onSelect(item.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-600">
                  {emptyText}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const Swap: React.FC = () => {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const finalizedExecutionsRef = useRef<Set<string>>(new Set())
  const latestQuoteRequestRef = useRef(0)
  const {
    accounts,
    activeAccountId,
    networks,
    disabledNetworkIds,
    backendSnapshot,
    sessionMnemonic,
    activeNetworkId,
    ensureNetworkAddress,
    addActivity,
    refreshActiveBalance,
    fetchNetworkAssets,
    getSendableItems,
    sendPreparedEvmTransaction,
    resolveBackendAuthAddress,
    signBackendAuthMessage
  } = useWalletStore()

  const enabledNetworks = getEnabledNetworks(networks, disabledNetworkIds)
  const activeAccount = accounts.find((account) => account.id === activeAccountId) || accounts[0]
  const initialNetworkId = activeNetworkId || enabledNetworks[0]?.id || ''
  const defaultDestinationNetworkId = enabledNetworks.find((network) => network.id !== initialNetworkId)?.id || initialNetworkId

  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [fromNetworkId, setFromNetworkId] = useState(initialNetworkId)
  const [toNetworkId, setToNetworkId] = useState(defaultDestinationNetworkId)
  const [fromAssetId, setFromAssetId] = useState('')
  const [toAssetId, setToAssetId] = useState('')
  const [sourceQuery, setSourceQuery] = useState('')
  const [destinationQuery, setDestinationQuery] = useState('')
  const [sourceSelectorFilter, setSourceSelectorFilter] = useState<AssetSelectorFilter>('all')
  const [destinationSelectorFilter, setDestinationSelectorFilter] = useState<AssetSelectorFilter>('all')
  const [serverChainPairs, setServerChainPairs] = useState<ServerSwapChainPair[]>([])
  const [sourceServerAssets, setSourceServerAssets] = useState<ServerSwapCatalogAsset[]>([])
  const [destinationMatrixMarkets, setDestinationMatrixMarkets] = useState<ServerSwapMatrixMarket[]>([])
  const [destinationServerAssets, setDestinationServerAssets] = useState<ServerSwapCatalogAsset[]>([])
  const [isSearchingDestinationAssets, setIsSearchingDestinationAssets] = useState(false)
  const [destinationSearchError, setDestinationSearchError] = useState('')
  const [slippagePct, setSlippagePct] = useState('0.5')
  const [sponsorPreference, setSponsorPreference] = useState<ServerSponsorPreference>('preferred')
  const [routePreference, setRoutePreference] = useState<WalletSwapRoutePreference>('best-value')
  const [tokenSelectorSide, setTokenSelectorSide] = useState<TokenSelectorSide | null>(null)
  const [quote, setQuote] = useState<ServerSwapQuote | null>(null)
  const [execution, setExecution] = useState<ServerExecutionStatus | null>(null)
  const [isQuoting, setIsQuoting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorText, setErrorText] = useState('')

  const deferredDestinationQuery = useDeferredValue(destinationQuery)

  const supportedSwapNetworks = useMemo(
    () => enabledNetworks.filter((network) => isSwapSupportedNetwork(network)),
    [enabledNetworks]
  )
  const swapCapabilityChains = useMemo(
    () => parseSwapCapabilityChains(backendSnapshot?.swapChains),
    [backendSnapshot?.swapChains]
  )
  const swapCapabilityChainById = useMemo(
    () => new Map(swapCapabilityChains.map((item) => [item.networkId, item])),
    [swapCapabilityChains]
  )
  const selectedFromNetwork = supportedSwapNetworks.find((network) => network.id === fromNetworkId)
    || enabledNetworks.find((network) => network.id === fromNetworkId)
    || supportedSwapNetworks[0]
    || enabledNetworks[0]
    || null
  const matrixDestinationNetworkIds = useMemo(
    () => new Set(destinationMatrixMarkets.map((item) => item.destinationNetworkId)),
    [destinationMatrixMarkets]
  )
  const sourceNetworkOptions = useMemo(
    () => filterNetworksBySwapChainPairs(supportedSwapNetworks, serverChainPairs, 'source'),
    [supportedSwapNetworks, serverChainPairs]
  )
  const destinationNetworkOptions = useMemo(
    () => {
      const pairFiltered = filterNetworksBySwapChainPairs(supportedSwapNetworks, serverChainPairs, 'destination', selectedFromNetwork)
      if (matrixDestinationNetworkIds.size <= 0) return pairFiltered
      const matrixFiltered = pairFiltered.filter((network) => (
        matrixDestinationNetworkIds.has(resolveSwapServerNetworkId(network))
      ))
      return matrixFiltered.length > 0 ? matrixFiltered : pairFiltered
    },
    [supportedSwapNetworks, serverChainPairs, selectedFromNetwork, matrixDestinationNetworkIds]
  )

  const fromNetwork = sourceNetworkOptions.find((network) => network.id === fromNetworkId)
    || enabledNetworks.find((network) => network.id === fromNetworkId)
    || sourceNetworkOptions[0]
    || enabledNetworks[0]
    || null
  const toNetwork = destinationNetworkOptions.find((network) => network.id === toNetworkId)
    || enabledNetworks.find((network) => network.id === toNetworkId)
    || destinationNetworkOptions[0]
    || enabledNetworks[0]
    || null
  const fromItems = useMemo(() => {
    if (!activeAccount?.id || !fromNetwork?.id) return []
    return getSendableItems({
      accountId: activeAccount.id,
      networkId: fromNetwork.id,
      includeHidden: true,
      includeZeroBalance: false
    })
  }, [activeAccount?.id, fromNetwork, getSendableItems])

  const sourceServerIndex = useMemo(
    () => buildLiveServerAssetIndex(sourceServerAssets),
    [sourceServerAssets]
  )

  const fromOptions = useMemo(
    () => fromItems.map((item) => createWalletAssetOptionWithServer(item, sourceServerIndex)),
    [fromItems, sourceServerIndex]
  )
  const fromItem = fromOptions.find((item) => item.id === fromAssetId) || fromOptions[0] || null
  const fromServerNetworkId = resolveSwapServerNetworkId(fromNetwork)
  const toServerNetworkId = resolveSwapServerNetworkId(toNetwork)
  const selectedMatrixMarket = useMemo(
    () => destinationMatrixMarkets.find((item) => item.destinationNetworkId === toServerNetworkId) || null,
    [destinationMatrixMarkets, toServerNetworkId]
  )

  const toOptions = useMemo(
    () => destinationServerAssets.map((item) => createServerAssetOption(item)),
    [destinationServerAssets]
  )
  const toItem = toOptions.find((item) => item.id === toAssetId) || toOptions[0] || null
  const fromChainCapabilities = swapCapabilityChainById.get(fromServerNetworkId) || null
  const toChainCapabilities = swapCapabilityChainById.get(toServerNetworkId) || null
  const swapReadiness = useMemo(() => {
    if (!fromNetwork || !toNetwork) {
      return {
        state: 'unsupported' as const,
        tone: 'slate' as const,
        engineLabel: 'Select networks',
        title: 'Choose networks to start swap search',
        detail: 'The wallet needs both source and destination networks before it can query the MetaYoshi server.',
        canRequestQuotes: false
      }
    }
    if (!isSwapSupportedNetwork(fromNetwork) || !isSwapSupportedNetwork(toNetwork)) {
      return {
        state: 'unsupported' as const,
        tone: 'slate' as const,
        engineLabel: 'Not supported',
        title: 'This network is outside the current swap scope',
        detail: 'This network does not currently expose the swap flow needed by the wallet.',
        canRequestQuotes: false
      }
    }
    return {
      state: 'active' as const,
      tone: 'emerald' as const,
      engineLabel: 'Live server routing',
      title: 'Server-backed swap search is available',
      detail: 'Sell tokens come from wallet balances. Destination chains, token lists, provider coverage, and route availability come from the MetaYoshi server.',
      canRequestQuotes: true
    }
  }, [fromNetwork, toNetwork])
  const fromBalance = fromItem?.amount || '0'
  const isSameAssetPair = Boolean(
    fromNetwork?.id
    && toNetwork?.id
    && fromItem
    && toItem
    && fromNetwork.id === toNetwork.id
    && resolveSwapAssetIdentity(fromItem, fromNetwork.id) === resolveSwapAssetIdentity(toItem, toNetwork.id)
  )
  const canRequestQuote = Boolean(
    fromAmount
    && fromItem
    && toItem
    && Number(fromAmount) > 0
    && !isSameAssetPair
    && fromNetwork
    && toNetwork
    && swapReadiness.canRequestQuotes
  )
  const quotePreviewKey = useMemo(() => buildQuotePreviewKey({
    amount: fromAmount,
    fromNetworkId: fromNetworkId || '',
    toNetworkId: toNetworkId || '',
    fromAssetId: fromAssetId || '',
    toAssetId: toAssetId || '',
    slippagePct,
    sponsorPreference,
    routePreference
  }), [fromAmount, fromNetworkId, toNetworkId, fromAssetId, toAssetId, slippagePct, sponsorPreference, routePreference])

  const fromQuickPicks = useMemo(
    () => pickQuickAssets(
      filterAssetOptions(fromOptions, '', sourceSelectorFilter),
      fromNetwork,
      resolveAssetFamily(fromItem || { kind: 'fungible' }) === sourceSelectorFilter || sourceSelectorFilter === 'all' ? fromItem : null
    ),
    [fromOptions, fromNetwork, fromItem, sourceSelectorFilter]
  )
  const toQuickPicks = useMemo(
    () => pickQuickAssets(
      filterAssetOptions(toOptions, '', destinationSelectorFilter),
      toNetwork,
      resolveAssetFamily(toItem || { kind: 'fungible' }) === destinationSelectorFilter || destinationSelectorFilter === 'all' ? toItem : null
    ),
    [toOptions, toNetwork, toItem, destinationSelectorFilter]
  )
  const sourceSelectorEmptyText = fromOptions.length > 0
    ? `No sell tokens match "${sourceQuery}". Try a symbol like ${fromOptions.slice(0, 3).map((item) => item.symbol).join(', ')}.`
    : 'No wallet balances are available to sell on this network yet.'
  const destinationSelectorEmptyText = isSearchingDestinationAssets
    ? 'Searching the live MetaYoshi server catalog and swap matrix...'
    : destinationSearchError
      ? destinationSearchError
      : (toOptions.length > 0
    ? `No receive tokens match "${destinationQuery}". Try a symbol like ${toOptions.slice(0, 3).map((item) => item.symbol).join(', ')}.`
    : 'No receive tokens were returned by the live MetaYoshi server for this route.')

  useEffect(() => {
    if (!enabledNetworks.length) return
    const activeOrFallback = activeNetworkId || enabledNetworks[0]?.id || ''
    if (!fromNetworkId && activeOrFallback) {
      setFromNetworkId(activeOrFallback)
    }
    if (!toNetworkId) {
      const destinationFallback = enabledNetworks.find((network) => network.id !== activeOrFallback)?.id || activeOrFallback
      setToNetworkId(destinationFallback)
    }
  }, [enabledNetworks, activeNetworkId, fromNetworkId, toNetworkId])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const pairs = await fetchServerSwapChainPairs()
        if (cancelled) return
        setServerChainPairs(pairs)
      } catch (error) {
        if (cancelled) return
        console.warn('Failed to load swap chain pairs from server', error)
        setServerChainPairs([])
      }
    })()

    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!sourceNetworkOptions.length) return
    if (!sourceNetworkOptions.some((network) => network.id === fromNetworkId)) {
      setFromNetworkId(sourceNetworkOptions[0].id)
    }
  }, [sourceNetworkOptions, fromNetworkId])

  useEffect(() => {
    if (!destinationNetworkOptions.length) return
    if (!destinationNetworkOptions.some((network) => network.id === toNetworkId)) {
      const fallback = destinationNetworkOptions.find((network) => network.id !== fromNetworkId) || destinationNetworkOptions[0]
      setToNetworkId(fallback.id)
    }
  }, [destinationNetworkOptions, toNetworkId, fromNetworkId])

  useEffect(() => {
    setDestinationQuery('')
    setToAssetId('')
  }, [toNetworkId])

  useEffect(() => {
    if (fromOptions.length === 0) {
      setFromAssetId('')
      return
    }
    if (!fromOptions.some((item) => item.id === fromAssetId)) {
      setFromAssetId(fromOptions[0].id)
    }
  }, [fromOptions, fromAssetId])

  useEffect(() => {
    if (toOptions.length === 0) {
      setToAssetId('')
      return
    }
    if (!toOptions.some((item) => item.id === toAssetId)) {
      const fallback = toOptions.find((item) => item.id !== fromAssetId) || toOptions[0]
      setToAssetId(fallback.id)
    }
  }, [toOptions, toAssetId, fromAssetId])

  useEffect(() => {
    let cancelled = false
    if (!fromNetwork?.id || !isSwapSupportedNetwork(fromNetwork)) {
      setSourceServerAssets([])
      return
    }

    void (async () => {
      try {
        const rows = await searchServerSwapAssets(fromNetwork, { limit: 500 })
        if (cancelled) return
        setSourceServerAssets(rows)
      } catch (error) {
        if (cancelled) return
        console.warn('Failed to load source swap assets from server', error)
        setSourceServerAssets([])
      }
    })()

    return () => { cancelled = true }
  }, [fromNetwork])

  useEffect(() => {
    let cancelled = false
    if (!fromNetwork?.id || !fromItem?.assetId || !isSwapSupportedNetwork(fromNetwork)) {
      setDestinationMatrixMarkets([])
      return
    }

    void (async () => {
      try {
        const markets = await fetchServerSwapMatrix({
          sourceNetwork: fromNetwork,
          sourceAssetId: fromItem.assetId
        })
        if (cancelled) return
        setDestinationMatrixMarkets(markets)
      } catch (error) {
        if (cancelled) return
        console.warn('Failed to load destination swap matrix from server', error)
        setDestinationMatrixMarkets([])
      }
    })()

    return () => { cancelled = true }
  }, [fromNetwork, fromItem?.assetId])

  useEffect(() => {
    if (!activeAccount?.id || !fromNetwork?.id || activeNetworkId !== fromNetwork.id) return

    void refreshActiveBalance({ fast: true, skipZeroBalanceRecheck: true }).catch((error) => {
      console.warn('Failed to refresh swap sell-side native balance', error)
    })
    void fetchNetworkAssets({ force: true, staleWhileRefresh: true }).catch((error) => {
      console.warn('Failed to refresh swap sell-side assets', error)
    })
  }, [activeAccount?.id, fromNetwork?.id, activeNetworkId, refreshActiveBalance, fetchNetworkAssets])

  useEffect(() => {
    let cancelled = false
    if (!toNetwork?.id || !isSwapSupportedNetwork(toNetwork)) {
      setDestinationServerAssets([])
      setDestinationSearchError('')
      setIsSearchingDestinationAssets(false)
      return
    }

    void (async () => {
      setIsSearchingDestinationAssets(true)
      setDestinationSearchError('')
      try {
        const matrixRows = (selectedMatrixMarket?.destinationItems || []).filter((item) => (
          matchesSwapCatalogQuery(item, deferredDestinationQuery)
        ))
        const serverRows = selectedMatrixMarket
          ? (
              matrixRows.length > 0 || !deferredDestinationQuery
                ? matrixRows
                : await searchServerSwapPairAssets({
                    sourceNetwork: fromNetwork || toNetwork,
                    destinationNetwork: toNetwork,
                    query: deferredDestinationQuery,
                    limit: 500
                  })
            )
          : await (
            fromNetwork
              ? searchServerSwapPairAssets({
                  sourceNetwork: fromNetwork,
                  destinationNetwork: toNetwork,
                  query: deferredDestinationQuery,
                  limit: 500
                })
              : searchServerSwapAssets(toNetwork, {
                  query: deferredDestinationQuery,
                  limit: 500
                })
          )
        if (cancelled) return
        if (serverRows.length > 0) {
          setDestinationServerAssets(mergeServerAssetLists(serverRows))
          return
        }

        const ecosystemRows = await loadTrackedDestinationAssets(toNetwork, deferredDestinationQuery)
        if (cancelled) return
        setDestinationServerAssets(mergeServerAssetLists(ecosystemRows))
        setDestinationSearchError(ecosystemRows.length > 0 ? '' : 'No receive tokens were returned by the server for this pair.')
      } catch (error) {
        if (cancelled) return
        console.warn('Failed to load destination swap assets from server', error)
        const ecosystemRows = await loadTrackedDestinationAssets(toNetwork, deferredDestinationQuery).catch(() => [])
        if (cancelled) return
        setDestinationServerAssets(mergeServerAssetLists(ecosystemRows))
        setDestinationSearchError(ecosystemRows.length > 0 ? '' : formatSwapUiError(error))
      } finally {
        if (!cancelled) setIsSearchingDestinationAssets(false)
      }
    })()

    return () => { cancelled = true }
  }, [deferredDestinationQuery, fromNetwork, selectedMatrixMarket, toNetwork])

  useEffect(() => {
    setQuote(null)
    setExecution(null)
    setToAmount('')
    setErrorText('')
  }, [quotePreviewKey])

  useEffect(() => {
    if (!execution || !fromNetwork || isTerminalServerExecutionStatus(execution.status)) return

    let cancelled = false
    const rpcConfig = createServerExecutionRpcConfig(fromNetwork, {
      secureBridgeAddressResolver: resolveBackendAuthAddress,
      secureBridgeSigner: signBackendAuthMessage
    })
    const executionId = execution.executionId

    const poll = async () => {
      for (let attempt = 0; attempt < 15; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 4000))
        if (cancelled) return
        try {
          const next = await fetchServerExecutionStatus(rpcConfig, executionId)
          if (cancelled) return
          setExecution(next)
          if (isTerminalServerExecutionStatus(next.status)) return
        } catch (error) {
          if (cancelled) return
          console.warn('Swap execution status poll failed', error)
        }
      }
    }

    void poll()
    return () => {
      cancelled = true
    }
  }, [execution, fromNetwork, resolveBackendAuthAddress, signBackendAuthMessage])

  useEffect(() => {
    if (!execution || !isTerminalServerExecutionStatus(execution.status)) return
    if (finalizedExecutionsRef.current.has(execution.executionId)) return
    finalizedExecutionsRef.current.add(execution.executionId)

    if (execution.status === 'confirmed') {
      addActivity({
        id: execution.executionId,
        type: 'swap',
        asset: `${fromItem?.symbol || fromNetwork?.symbol || 'FROM'} -> ${toItem?.symbol || toNetwork?.symbol || 'TO'}`,
        assetId: String(fromItem?.assetId || '').trim() || (fromNetwork?.id ? `native:${fromNetwork.id}` : undefined),
        amount: fromAmount,
        accountId: activeAccount?.id,
        status: 'confirmed',
        timestamp: Date.now(),
        networkId: fromNetwork?.id || activeNetworkId,
        from: activeAccount?.networkAddresses?.[fromNetworkId],
        to: activeAccount?.networkAddresses?.[toNetworkId]
      })
      showToast('Swap confirmed by server execution', 'success')
      if (activeNetworkId === fromNetworkId || activeNetworkId === toNetworkId) {
        void refreshActiveBalance()
      }
      return
    }

    addActivity({
      id: `${execution.executionId}-rejected`,
      type: 'swap',
      asset: `${fromItem?.symbol || fromNetwork?.symbol || 'FROM'} -> ${toItem?.symbol || toNetwork?.symbol || 'TO'}`,
      assetId: String(fromItem?.assetId || '').trim() || (fromNetwork?.id ? `native:${fromNetwork.id}` : undefined),
      amount: fromAmount,
      accountId: activeAccount?.id,
      status: 'rejected',
      timestamp: Date.now(),
      networkId: fromNetwork?.id || activeNetworkId,
      from: activeAccount?.networkAddresses?.[fromNetworkId],
      to: activeAccount?.networkAddresses?.[toNetworkId]
    })
    showToast(execution.detail || `Swap ${execution.status}`, 'error')
  }, [
    execution,
    addActivity,
    showToast,
    fromItem,
    fromNetwork,
    toItem,
    toNetwork,
    fromAmount,
    activeAccount,
    activeNetworkId,
    fromNetworkId,
    toNetworkId,
    refreshActiveBalance
  ])

  const buildSwapContext = async () => {
    if (!fromNetwork) throw new Error('Select a source network')
    if (!toNetwork) throw new Error('Select a destination network')
    if (!fromItem) throw new Error('Select a source asset')
    if (!toItem) throw new Error('Select a destination asset')
    if (!fromAmount || Number(fromAmount) <= 0) throw new Error('Enter a valid amount')
    if (isSameAssetPair) throw new Error('Choose a different destination asset')

    const resolveSwapAddress = async (network: Network) => {
      if (network.coinType === 'EVM') {
        const signerAddress = String(await resolveBackendAuthAddress() || '').trim()
        if (!signerAddress) throw new Error(`Could not resolve a ${network.symbol} signer address`)
        return signerAddress
      }
      const walletAddress = String(await ensureNetworkAddress(network.id) || '').trim()
      if (!walletAddress) throw new Error(`Could not derive a ${network.symbol} wallet address`)
      return walletAddress
    }

    const [sourceAddress, destinationAddress] = await Promise.all([
      resolveSwapAddress(fromNetwork),
      resolveSwapAddress(toNetwork)
    ])
    const sourceNetworkId = resolveSwapServerNetworkId(fromNetwork)
    const destinationNetworkId = resolveSwapServerNetworkId(toNetwork)

    const sourceRpcConfig = createServerExecutionRpcConfig(fromNetwork, {
      secureBridgeAddressResolver: resolveBackendAuthAddress,
      secureBridgeSigner: signBackendAuthMessage
    })
    const destinationRpcConfig = createServerExecutionRpcConfig(toNetwork, {
      secureBridgeAddressResolver: resolveBackendAuthAddress,
      secureBridgeSigner: signBackendAuthMessage
    })
    const sourceAssetBase = toServerSwapAsset(fromItem, sourceNetworkId)
    const destinationAssetBase = toServerSwapAsset(toItem, destinationNetworkId)
    const [sourceAsset, destinationAsset] = await Promise.all([
      withResolvedSwapAsset(fromNetwork, sourceRpcConfig, sourceAssetBase),
      withResolvedSwapAsset(toNetwork, destinationRpcConfig, destinationAssetBase)
    ])

    return {
      rpcConfig: createServerExecutionRpcConfig(fromNetwork, {
        secureBridgeAddressResolver: resolveBackendAuthAddress,
        secureBridgeSigner: signBackendAuthMessage,
        sendTransaction: async (tx) => await sendPreparedEvmTransaction({
          networkId: fromNetwork.id,
          tx
        })
      }),
      sourceAddress,
      destinationAddress,
      sourceNetworkId,
      destinationNetworkId,
      sourceAsset,
      destinationAsset
    }
  }

  const requestQuote = async (options?: { suppressErrors?: boolean; suppressSuccess?: boolean }) => {
    if (!swapReadiness.canRequestQuotes) {
      setErrorText(swapReadiness.detail)
      if (!options?.suppressErrors) {
        showToast(swapReadiness.title, 'info')
      }
      return
    }

    const requestId = ++latestQuoteRequestRef.current
    setIsQuoting(true)
    setErrorText('')
    try {
      const {
        rpcConfig,
        sourceAddress,
        destinationAddress,
        sourceNetworkId,
        destinationNetworkId,
        sourceAsset,
        destinationAsset
      } = await buildSwapContext()
      const slippage = Number(slippagePct)
      const nextQuote = await requestServerSwapQuote(rpcConfig, {
        source: {
          networkId: sourceNetworkId,
          chainId: fromNetwork!.chainId,
          symbol: fromItem?.symbol || fromNetwork!.symbol,
          address: sourceAddress,
          amount: fromAmount,
          asset: sourceAsset
        },
        destination: {
          networkId: destinationNetworkId,
          chainId: toNetwork!.chainId,
          symbol: toItem?.symbol || toNetwork!.symbol,
          address: destinationAddress,
          asset: destinationAsset
        },
        slippageBps: Number.isFinite(slippage) ? Math.max(1, Math.round(slippage * 100)) : 50,
        sponsorPreference
      })
      if (latestQuoteRequestRef.current !== requestId) return
      setQuote(nextQuote)
      setToAmount(nextQuote.destinationAmount)
      setErrorText('')
      if (!options?.suppressSuccess) {
        showToast('Quote ready', 'success')
      }
    } catch (error) {
      if (latestQuoteRequestRef.current !== requestId) return
      const message = formatSwapUiError(error)
      setQuote(null)
      setToAmount('')
      setErrorText(message)
      if (!options?.suppressErrors) {
        showToast(message, 'error')
      }
    } finally {
      if (latestQuoteRequestRef.current === requestId) {
        setIsQuoting(false)
      }
    }
  }

  const submitQuote = async () => {
    if (!quote || !fromNetwork || !toNetwork || !fromItem || !toItem) {
      showToast('Request a server quote first', 'error')
      return
    }
    if (!swapReadiness.canRequestQuotes) {
      setErrorText(swapReadiness.detail)
      showToast(swapReadiness.title, 'info')
      return
    }

    setIsSubmitting(true)
    setErrorText('')
    try {
      const {
        rpcConfig,
        sourceAddress,
        destinationAddress,
        sourceNetworkId,
        destinationNetworkId,
        sourceAsset,
        destinationAsset
      } = await buildSwapContext()
      const providerExecution = await buildSignedProviderExecution({
        quote,
        sourceNetwork: fromNetwork,
        mnemonic: sessionMnemonic,
        accountIndex: Number(activeAccount?.derivationIndex) || 0
      })
      const submitted = await submitServerSwap(rpcConfig, {
        quoteId: quote.quoteId,
        source: {
          networkId: sourceNetworkId,
          chainId: fromNetwork.chainId,
          symbol: fromItem.symbol || fromNetwork.symbol,
          address: sourceAddress,
          amount: fromAmount,
          asset: sourceAsset
        },
        destination: {
          networkId: destinationNetworkId,
          chainId: toNetwork.chainId,
          symbol: toItem.symbol || toNetwork.symbol,
          address: destinationAddress,
          asset: destinationAsset
        },
        minDestinationAmount: quote.minDestinationAmount,
        sponsorPreference,
        executionMode: quote.mode,
        quoteMetadata: quote.metadata,
        providerExecution
      })
      setExecution(submitted)
      showToast('Swap submitted to server execution', 'info')
    } catch (error) {
      const message = formatSwapUiError(error)
      setErrorText(message)
      showToast(message, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const flipSwapDirection = () => {
    const prevFromNetworkId = fromNetworkId
    const prevToNetworkId = toNetworkId
    const prevFromAssetId = fromAssetId
    const prevToAssetId = toAssetId
    const prevToAmount = toAmount

    setFromNetworkId(prevToNetworkId)
    setToNetworkId(prevFromNetworkId)
    setFromAssetId(prevToAssetId)
    setToAssetId(prevFromAssetId)
    if (prevToAmount) setFromAmount(prevToAmount)
  }

  const swapUnavailable = !swapReadiness.canRequestQuotes || fromOptions.length === 0
  const swapStatus = execution
    ? execution.status === 'confirmed'
      ? 'Confirmed'
      : execution.status === 'failed' || execution.status === 'rejected' || execution.status === 'expired'
        ? 'Failed'
        : 'Submitting'
    : quote
      ? 'Quote ready'
      : isQuoting
        ? 'Requesting quote'
        : swapUnavailable
            ? 'Unavailable'
            : 'Idle'
  const quoteStatusText = quote
    ? 'Quote ready. Review the received amount, fees, and expiry before signing.'
    : swapUnavailable
        ? swapReadiness.detail
        : (isQuoting
        ? 'Requesting a quote from the MetaYoshi server.'
        : 'Search the live server catalog for the receive token, then request a quote to preview the amount.')
  const rateText = quote
    ? `1 ${quote.sourceSymbol || fromItem?.symbol || fromNetwork?.symbol || 'FROM'} = ${formatQuoteRate(quote)} ${quote.destinationSymbol || toItem?.symbol || toNetwork?.symbol || 'TO'}`
    : 'Rate appears here after the server returns a quote'
  const summaryStatusText = swapReadiness.state === 'active'
    ? 'Server-backed search'
    : 'Selection incomplete'
  const summaryRouteText = `${fromNetwork?.name || 'Source'} -> ${toNetwork?.name || 'Destination'}`
  const summaryAmountText = quote
    ? `${quote.sourceAmount} ${quote.sourceSymbol || fromItem?.symbol} -> ${quote.destinationAmount} ${quote.destinationSymbol || toItem?.symbol}`
    : null
  const runtimeServices = (backendSnapshot?.runtimeHealth?.services && typeof backendSnapshot.runtimeHealth.services === 'object')
    ? backendSnapshot.runtimeHealth.services as Record<string, { ok?: boolean; status?: string }>
    : null
  const availabilityTitle = runtimeServices?.gateway?.ok === false
    ? 'Swaps are temporarily unavailable'
    : swapReadiness.canRequestQuotes
      ? 'Ready to get a quote'
      : 'Choose what you want to swap'
  const availabilityText = runtimeServices?.gateway?.ok === false
    ? 'Swap service is reconnecting. Your wallet is safe, and you can try again shortly.'
    : quote
      ? 'Your quote is ready. Review the amount and confirm when you are ready.'
      : swapUnavailable
        ? swapReadiness.detail
        : 'Pick the asset you want to sell and the one you want to receive to continue.'
  const sellSummaryText = !fromNetwork
    ? 'Choose the network and asset you want to sell.'
    : fromChainCapabilities?.supportsSwap === false
      ? `${fromNetwork.name} is not available for swaps right now.`
      : fromItem
        ? `Selling ${fromItem.symbol} from ${fromNetwork.name}.`
        : `Choose what you want to sell from ${fromNetwork.name}.`
  const receiveSummaryText = !toNetwork
    ? 'Choose where you want to receive funds.'
    : fromItem?.assetId
      ? selectedMatrixMarket
        ? `Receiving on ${toNetwork.name}. Available options are ready for this destination.`
        : destinationMatrixMarkets.length > 0
          ? `Choose where to receive your swap. We found available destinations for this asset.`
          : `This asset is not available on ${toNetwork.name} right now.`
      : `Choose where you want the swap to arrive on ${toNetwork.name}.`

  return (
    <div className="swap-dark-page flex h-full flex-col bg-[#f5f7fb] text-slate-900">
      <header className="flex items-center justify-between border-b border-white/10 bg-white/70 px-4 py-4 backdrop-blur-xl">
        <button
          onClick={() => navigate('/wallet/assets')}
          className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <IoArrowBackOutline className="w-5 h-5" />
        </button>
        <div className="text-center">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-300">MetaYoshi Exchange</div>
          <h1 className="mt-1 text-[1.05rem] font-semibold tracking-tight text-slate-950">Swap</h1>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
          swapReadiness.state === 'active'
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
            : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
        }`}>
          {swapReadiness.state === 'active' ? 'Ready' : 'Limited'}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="space-y-4 p-4">
          <section className="wallet-surface p-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Sell network</span>
                <select
                  value={fromNetworkId}
                  onChange={(event) => setFromNetworkId(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-[11px] font-bold text-slate-900 outline-none"
                >
                  {sourceNetworkOptions.map((network) => (
                    <option key={network.id} value={network.id}>{network.name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Buy network</span>
                <select
                  value={toNetworkId}
                  onChange={(event) => setToNetworkId(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-[11px] font-bold text-slate-900 outline-none"
                >
                  {destinationNetworkOptions.map((network) => (
                    <option key={network.id} value={network.id}>{network.name}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="wallet-surface p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Status</div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{availabilityTitle}</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">{availabilityText}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">You Send</div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{fromNetwork?.name || 'Select a network'}</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">{sellSummaryText}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">You Receive</div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{toNetwork?.name || 'Select a network'}</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">{receiveSummaryText}</p>
              </div>
            </div>
          </section>

          <section className="wallet-surface relative overflow-hidden p-3">
            <div className="pointer-events-none absolute inset-x-8 top-4 h-24 rounded-full bg-orange-500/12 blur-3xl" />
            <div className="relative space-y-3">
              <section className="rounded-[28px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">You pay</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                    {fromNetwork?.name || 'Select network'}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-[1fr_auto] items-end gap-3">
                  <div>
                    <input
                      type="number"
                      placeholder="0.0"
                      value={fromAmount}
                      onChange={(event) => setFromAmount(event.target.value)}
                      className="w-full bg-transparent text-[36px] font-semibold tracking-tight text-slate-950 outline-none placeholder:text-slate-500"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      Enter the amount you want to swap from {fromNetwork?.name || 'the selected chain'}.
                    </p>
                  </div>
                  <SwapAssetButton
                    option={fromItem}
                    networkName={fromNetwork?.name}
                    placeholder="Choose token"
                    onClick={() => setTokenSelectorSide('from')}
                  />
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 text-[11px] text-slate-400">
                  <span>Available balance</span>
                  <button
                    type="button"
                    onClick={() => setFromAmount(fromBalance)}
                    className="font-medium text-slate-700 transition-colors hover:text-slate-950"
                  >
                    {fromBalance} {fromItem?.symbol || fromNetwork?.symbol}
                  </button>
                </div>

                {fromQuickPicks.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Quick sell picks</span>
                      <span className="text-[10px] text-slate-500">Wallet balances</span>
                    </div>
                    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                      {fromQuickPicks.map((item) => (
                        <AssetCompactTab
                          key={`from-quick-${item.id}`}
                          active={item.id === fromAssetId}
                          option={item}
                          contextLabel={fromNetwork?.name}
                          onClick={() => setFromAssetId(item.id)}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>

              <div className="flex justify-center -my-1">
                <button
                  type="button"
                  onClick={flipSwapDirection}
                  className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/10 bg-[#151922] text-slate-200 shadow-[0_14px_28px_rgba(0,0,0,0.28)] transition-colors hover:border-white/20 hover:bg-[#1a1f2b]"
                  title="Switch assets and networks"
                >
                  <IoSwapVerticalOutline className="w-5 h-5" />
                </button>
              </div>

              <section className="rounded-[28px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">You receive</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                    {toNetwork?.name || 'Select network'}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-[1fr_auto] items-end gap-3">
                  <div>
                    <div className="text-[36px] font-semibold tracking-tight text-slate-950">
                      {quote ? toAmount || '0.0' : (isQuoting && canRequestQuote ? '...' : '0.0')}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {quoteStatusText}
                    </p>
                  </div>
                  <SwapAssetButton
                    option={toItem}
                    networkName={toNetwork?.name}
                    placeholder="Choose token"
                    onClick={() => setTokenSelectorSide('to')}
                  />
                </div>

                {toQuickPicks.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Quick buy picks</span>
                      <span className="text-[10px] text-slate-500">Live server catalog</span>
                    </div>
                    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                      {toQuickPicks.map((item) => (
                        <AssetCompactTab
                          key={`to-quick-${item.id}`}
                          active={item.id === toAssetId}
                          option={item}
                          contextLabel={toNetwork?.name}
                          onClick={() => setToAssetId(item.id)}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            </div>
          </section>

          <section className="overflow-hidden wallet-surface">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Best quote</p>
                <p className="text-[11px] text-slate-400">A simple estimate for the tokens you selected.</p>
              </div>
              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${
                swapStatus === 'Confirmed'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : swapStatus === 'Failed' || swapStatus === 'Unavailable'
                    ? 'border-red-500/30 bg-red-500/10 text-red-300'
                    : swapStatus === 'Quote ready'
                      ? 'border-orange-500/30 bg-orange-500/10 text-orange-200'
                      : 'border-sky-500/30 bg-sky-500/10 text-sky-300'
              }`}>
                {swapStatus}
              </span>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    <IoTrendingUpOutline className="h-3.5 w-3.5" />
                    Effective Rate
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{rateText}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Minimum Received</div>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {quote ? `${quote.minDestinationAmount} ${quote.destinationSymbol || toItem?.symbol || toNetwork?.symbol || ''}` : '--'}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-[11px] text-slate-600">
                {quote ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Selected path</span>
                      <span className="font-semibold text-slate-900">{fromNetwork?.name || 'Source'} to {toNetwork?.name || 'Destination'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Quote expires</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                        <IoTimeOutline className="h-3.5 w-3.5" />
                        {formatExpiry(quote.expiresAt)}
                      </span>
                    </div>
                    <p className="text-slate-400">
                      Fees and routing protections are handled automatically. Review the receive amount and confirm when ready.
                    </p>
                  </div>
                ) : (
                  <p>Select the token pair and amount. MetaYoshi will fetch the best available quote automatically.</p>
                )}
              </div>
            </div>
          </section>

          {quote?.warnings.length ? (
            <section className="space-y-1 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-200">Notice</p>
              {quote.warnings.map((warning) => (
                <p key={warning} className="text-[11px] text-amber-100">{warning}</p>
              ))}
            </section>
          ) : null}

          {execution ? (
            <section className="wallet-soft-surface space-y-2 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Execution Status</p>
                <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${
                  execution.status === 'confirmed'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : execution.status === 'failed' || execution.status === 'rejected' || execution.status === 'expired'
                      ? 'border-red-500/30 bg-red-500/10 text-red-300'
                      : 'border-sky-500/30 bg-sky-500/10 text-sky-300'
                }`}>
                  {execution.status}
                </span>
              </div>
              <div className="space-y-2">
                <DetailRow label="Execution id" value={execution.executionId} />
                {execution.receipt?.txid ? <DetailRow label="Txid" value={execution.receipt.txid} /> : null}
                {execution.detail ? <DetailRow label="Detail" value={execution.detail} /> : null}
              </div>
            </section>
          ) : null}

          {errorText ? (
            <section className={`rounded-2xl border p-3 ${
              swapReadiness.state === 'active'
                ? 'border-red-500/30 bg-red-500/10'
                : 'border-amber-500/30 bg-amber-500/10'
            }`}>
              <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${
                swapReadiness.state === 'active' ? 'text-red-300' : 'text-amber-200'
              }`}>
                {swapReadiness.state === 'active' ? 'Could Not Continue' : 'Route Not Live Yet'}
              </p>
              <p className={`mt-1 text-[11px] ${
                swapReadiness.state === 'active' ? 'text-red-100' : 'text-amber-100'
              }`}>{errorText}</p>
            </section>
          ) : null}
        </div>
      </div>

      <div className="space-y-2 border-t border-white/10 bg-white/70 px-4 py-3 backdrop-blur-xl">
        <div className="wallet-soft-surface px-3 py-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Swap Summary</p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                {formatAssetSummaryLabel(fromItem, fromNetwork?.name, fromNetwork?.symbol)} {'->'} {formatAssetSummaryLabel(toItem, toNetwork?.name, toNetwork?.symbol)}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px]">
                <span className="text-slate-400">{summaryRouteText}</span>
                <span className={`rounded-full px-2 py-0.5 font-semibold ${
                  swapReadiness.state === 'active'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-amber-500/10 text-amber-300'
                }`}>
                  {summaryStatusText}
                </span>
              </div>
            </div>
            {summaryAmountText ? (
              <span className="max-w-[42%] text-right text-[10px] font-medium text-slate-400">
                {summaryAmountText}
              </span>
            ) : null}
          </div>
        </div>

        {quote ? (
          <Button
            className="w-full"
            onClick={submitQuote}
            isLoading={isSubmitting}
            disabled={!quote || isQuoting || isSameAssetPair || swapUnavailable}
          >
            Sign and submit
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={() => { void requestQuote() }}
            isLoading={isQuoting}
            disabled={!canRequestQuote || swapUnavailable}
          >
            {isQuoting
              ? 'Requesting quote'
              : 'Get quote'}
          </Button>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => { void requestQuote({ suppressSuccess: false }) }}
          isLoading={isQuoting}
          disabled={!canRequestQuote || isSubmitting || swapUnavailable}
        >
          {quote ? 'Refresh quote' : 'Retry quote'}
        </Button>
      </div>

      {tokenSelectorSide === 'from' ? (
        <TokenSelectorModal
          title="Select sell token"
          networkName={fromNetwork?.name}
          optionContextLabel={fromNetwork?.name}
          query={sourceQuery}
          onQueryChange={setSourceQuery}
          quickPicks={fromQuickPicks}
          options={fromOptions}
          selectedOptionId={fromAssetId}
          filter={sourceSelectorFilter}
          onFilterChange={setSourceSelectorFilter}
          emptyText={sourceSelectorEmptyText}
          onSelect={(optionId) => {
            setFromAssetId(optionId)
            setTokenSelectorSide(null)
          }}
          onClose={() => setTokenSelectorSide(null)}
        />
      ) : null}

      {tokenSelectorSide === 'to' ? (
        <TokenSelectorModal
          title="Select receive token"
          networkName={toNetwork?.name}
          optionContextLabel={toNetwork?.name}
          query={destinationQuery}
          onQueryChange={setDestinationQuery}
          quickPicks={toQuickPicks}
          options={toOptions}
          selectedOptionId={toAssetId}
          filter={destinationSelectorFilter}
          onFilterChange={setDestinationSelectorFilter}
          emptyText={destinationSelectorEmptyText}
          onSelect={(optionId) => {
            setToAssetId(optionId)
            setTokenSelectorSide(null)
          }}
          onClose={() => setTokenSelectorSide(null)}
        />
      ) : null}
    </div>
  )

}

export default Swap
