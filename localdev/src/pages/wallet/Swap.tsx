import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IoArrowBackOutline,
  IoInformationCircleOutline,
  IoSettingsOutline,
  IoSwapVerticalOutline,
  IoTimeOutline,
  IoTrendingUpOutline
} from 'react-icons/io5'
import { Button } from '../../components/Button'
import { useToast } from '../../components/Toast'
import { getCoinManifestByAlias } from '../../coins/coinRegistry'
import type { Network } from '../../coins/types'
import type { ServerCoinCatalogItem } from '../../coins/serverRegistry/types'
import { searchMetayoshiServerCatalogAssets } from '../../lib/catalogDb/repository'
import { getEnabledNetworks } from '../../lib/networkVisibility'
import { findSwapAssetAliasOptions } from '../../lib/swapAssetAliases'
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
  type ServerSwapQuote
} from '../../lib/serverExecution'
import { useWalletStore, type SendableItem } from '../../store/walletStore'

function compactError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? 'Unknown error')
  return message.replace(/\s+/g, ' ').trim()
}

function formatSwapUiError(error: unknown): string {
  const message = compactError(error)
  const normalized = message.toLowerCase()

  if (normalized.includes('vite_app_api_key is required')) {
    return 'Swap is not configured yet. Set VITE_APP_API_KEY for the server API and reload the wallet.'
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

  if (normalized.includes('server execution request failed')) {
    return 'Swap service is temporarily unavailable. Please try again in a moment.'
  }

  return message
}

function isQuoteRouteAvailabilityError(error: unknown): boolean {
  const message = compactError(error).toLowerCase()
  return message.includes('no route')
    || message.includes('not available for the requested asset pair')
    || message.includes('route is available')
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

function formatModeLabel(mode?: ServerSwapQuote['mode']): string {
  if (mode === 'sponsored') return 'Sponsored'
  if (mode === 'intent') return 'Intent'
  return 'Standard'
}

function isSwapEligibleItem(item: SendableItem): boolean {
  return item.kind !== 'nft'
}

type SwapAssetOption = {
  id: string
  source: 'wallet' | 'catalog'
  assetId: string
  kind: 'native' | 'fungible' | 'nft'
  symbol: string
  label: string
  contractAddress?: string
  amount?: string
}

type ChainSegment = 'all' | 'l1' | 'l2' | 'non-evm'

type QuoteRequestMode = 'auto' | 'manual'

const CHAIN_SEGMENTS: Array<{ id: ChainSegment; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'l1', label: 'L1' },
  { id: 'l2', label: 'L2' },
  { id: 'non-evm', label: 'Other' }
]

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

function createWalletAssetOption(item: SendableItem): SwapAssetOption {
  return {
    id: item.id,
    source: 'wallet',
    assetId: String(item.assetId || item.id || '').trim() || item.id,
    kind: item.kind,
    symbol: item.symbol,
    label: item.label,
    contractAddress: inferAssetContractAddress(item),
    amount: item.amount
  }
}

function createCatalogAssetOption(item: ServerCoinCatalogItem, networkId: string): SwapAssetOption {
  const contractAddress = String(item.contractAddress || '').trim() || undefined
  const assetId = item.kind === 'main'
    ? `native:${networkId}`
    : (contractAddress || String(item.coinId || '').trim() || `catalog:${networkId}:${item.symbol}`)
  return {
    id: `catalog:${networkId}:${String(item.coinId || item.symbol || assetId).trim()}:${contractAddress || item.kind}`,
    source: 'catalog',
    assetId,
    kind: item.kind === 'main' ? 'native' : 'fungible',
    symbol: item.symbol,
    label: item.name,
    contractAddress
  }
}

function formatAssetOption(item: SwapAssetOption): string {
  const label = !item.label || item.label === item.symbol
    ? item.symbol
    : `${item.symbol} - ${item.label}`
  return item.source === 'catalog' ? `${label} (Catalog)` : label
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
  const contractAddress = String(item.contractAddress || '').trim().toLowerCase()
  if (contractAddress) return contractAddress
  return String(item.assetId || item.id || '').trim().toLowerCase()
}

function mergeAssetOptions(primary: SwapAssetOption[], extra: SwapAssetOption[]): SwapAssetOption[] {
  const out: SwapAssetOption[] = []
  const seen = new Set<string>()
  for (const item of [...primary, ...extra]) {
    const contractAddress = String(item.contractAddress || '').trim().toLowerCase()
    const key = item.kind === 'native'
      ? `native::${item.symbol.toLowerCase()}`
      : (contractAddress || String(item.assetId || '').trim().toLowerCase() || item.id.toLowerCase())
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

function toServerSwapAsset(item: SwapAssetOption | null, networkId: string): ServerSwapAssetRef | undefined {
  if (!item) return undefined
  const assetId = String(item.assetId || '').trim() || (item.kind === 'native' ? `native:${networkId}` : item.id)
  return {
    assetId,
    kind: item.kind === 'native' ? 'native' : 'fungible',
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
  if (network.coinType !== 'EVM' || asset.kind === 'native') return asset
  return {
    ...asset,
    decimals: await resolveServerSwapAssetDecimals(rpcConfig, asset)
  }
}

function resolveSwapNetworkSegment(network: Pick<Network, 'id' | 'runtimeModelId' | 'coinType'>): ChainSegment {
  if (network.coinType !== 'EVM') return 'non-evm'
  const manifest = getCoinManifestByAlias(network.id) || getCoinManifestByAlias(String(network.runtimeModelId || ''))
  const runtimeHint = String(network.runtimeModelId || network.id || '').trim().toLowerCase()
  if (manifest?.isEthereumLayer2 || runtimeHint.startsWith('eth-l2--')) return 'l2'
  return 'l1'
}

function filterNetworksBySegment(networks: Network[], segment: ChainSegment): Network[] {
  if (segment === 'all') return networks
  return networks.filter((network) => resolveSwapNetworkSegment(network) === segment)
}

function formatNetworkSegment(network: Pick<Network, 'id' | 'runtimeModelId' | 'coinType'>): string {
  const segment = resolveSwapNetworkSegment(network)
  if (segment === 'l2') return 'L2'
  if (segment === 'l1') return 'L1'
  return 'Other'
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

function buildQuotePreviewKey(input: {
  amount: string
  fromNetworkId: string
  toNetworkId: string
  fromAssetId: string
  toAssetId: string
  slippagePct: string
  sponsorPreference: ServerSponsorPreference
}): string {
  return [
    input.amount.trim(),
    input.fromNetworkId,
    input.toNetworkId,
    input.fromAssetId,
    input.toAssetId,
    input.slippagePct,
    input.sponsorPreference
  ].join('|')
}

function DetailRow({ label, value, subdued = false }: { label: string; value: React.ReactNode; subdued?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[11px]">
      <span className={subdued ? 'text-gray-400' : 'text-gray-500'}>{label}</span>
      <span className="text-right font-semibold text-gray-200">{value}</span>
    </div>
  )
}

function TogglePill({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] transition-colors ${
        active
          ? 'border-primary/40 bg-primary/15 text-orange-100'
          : 'border-dark-600 bg-dark-700/40 text-gray-400 hover:border-dark-500 hover:text-gray-200'
      }`}
    >
      {label}
    </button>
  )
}

function AssetQuickPick({ active, option, onClick }: { active: boolean; option: SwapAssetOption; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-[10px] font-bold transition-colors ${
        active
          ? 'border-blue-400/45 bg-blue-500/15 text-blue-100'
          : 'border-dark-600 bg-dark-800/70 text-gray-300 hover:border-dark-500 hover:text-white'
      }`}
    >
      {option.symbol}
    </button>
  )
}

const Swap: React.FC = () => {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const finalizedExecutionsRef = useRef<Set<string>>(new Set())
  const latestQuoteRequestRef = useRef(0)
  const lastResolvedQuoteKeyRef = useRef('')
  const {
    accounts,
    activeAccountId,
    networks,
    disabledNetworkIds,
    activeNetworkId,
    ensureNetworkAddress,
    addActivity,
    refreshActiveBalance,
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
  const [fromNetworkFilter, setFromNetworkFilter] = useState<ChainSegment>('all')
  const [toNetworkFilter, setToNetworkFilter] = useState<ChainSegment>('all')
  const [fromNetworkId, setFromNetworkId] = useState(initialNetworkId)
  const [toNetworkId, setToNetworkId] = useState(defaultDestinationNetworkId)
  const [fromAssetId, setFromAssetId] = useState('')
  const [toAssetId, setToAssetId] = useState('')
  const [destinationQuery, setDestinationQuery] = useState('')
  const [catalogDestinationItems, setCatalogDestinationItems] = useState<SwapAssetOption[]>([])
  const [slippagePct, setSlippagePct] = useState('0.5')
  const [sponsorPreference, setSponsorPreference] = useState<ServerSponsorPreference>('preferred')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [selectionHint, setSelectionHint] = useState('')
  const [quote, setQuote] = useState<ServerSwapQuote | null>(null)
  const [execution, setExecution] = useState<ServerExecutionStatus | null>(null)
  const [isQuoting, setIsQuoting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorText, setErrorText] = useState('')

  const deferredAmount = useDeferredValue(fromAmount)
  const deferredDestinationQuery = useDeferredValue(destinationQuery)

  const sourceNetworkOptions = useMemo(
    () => filterNetworksBySegment(enabledNetworks, fromNetworkFilter),
    [enabledNetworks, fromNetworkFilter]
  )
  const destinationNetworkOptions = useMemo(
    () => filterNetworksBySegment(enabledNetworks, toNetworkFilter),
    [enabledNetworks, toNetworkFilter]
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
      includeHidden: false,
      includeZeroBalance: false
    }).filter(isSwapEligibleItem)
  }, [activeAccount?.id, fromNetwork?.id, getSendableItems])

  const walletToItems = useMemo(() => {
    if (!activeAccount?.id || !toNetwork?.id) return []
    return getSendableItems({
      accountId: activeAccount.id,
      networkId: toNetwork.id,
      includeHidden: true,
      includeZeroBalance: true
    }).filter(isSwapEligibleItem)
  }, [activeAccount?.id, toNetwork?.id, getSendableItems])

  const fromOptions = useMemo(() => fromItems.map(createWalletAssetOption), [fromItems])
  const toOptions = useMemo(
    () => mergeAssetOptions(walletToItems.map(createWalletAssetOption), catalogDestinationItems),
    [walletToItems, catalogDestinationItems]
  )

  const fromItem = fromOptions.find((item) => item.id === fromAssetId) || fromOptions[0] || null
  const toItem = toOptions.find((item) => item.id === toAssetId) || toOptions[0] || null
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
    deferredAmount
    && fromItem
    && toItem
    && Number(deferredAmount) > 0
    && !isSameAssetPair
    && fromNetwork
    && toNetwork
  )
  const quotePreviewKey = useMemo(() => buildQuotePreviewKey({
    amount: deferredAmount,
    fromNetworkId: fromNetworkId || '',
    toNetworkId: toNetworkId || '',
    fromAssetId: fromAssetId || '',
    toAssetId: toAssetId || '',
    slippagePct,
    sponsorPreference
  }), [deferredAmount, fromNetworkId, toNetworkId, fromAssetId, toAssetId, slippagePct, sponsorPreference])

  const fromQuickPicks = useMemo(
    () => pickQuickAssets(fromOptions, fromNetwork, fromItem),
    [fromOptions, fromNetwork, fromItem]
  )
  const toQuickPicks = useMemo(
    () => pickQuickAssets(toOptions, toNetwork, toItem),
    [toOptions, toNetwork, toItem]
  )

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
    if (!toNetwork?.id) {
      setCatalogDestinationItems([])
      return
    }

    void (async () => {
      try {
        const runtimeModelId = String(toNetwork.runtimeModelId || '').trim() || null
        const rows = await searchMetayoshiServerCatalogAssets({
          query: deferredDestinationQuery,
          networkId: toNetwork.id,
          runtimeModelId,
          includeMain: true,
          maxResults: deferredDestinationQuery ? 24 : 12
        })
        if (cancelled) return
        setCatalogDestinationItems(rows.map((item) => createCatalogAssetOption(item, toNetwork.id)))
      } catch (error) {
        if (cancelled) return
        console.warn('Failed to load destination catalog assets', error)
        setCatalogDestinationItems([])
      }
    })()

    return () => { cancelled = true }
  }, [deferredDestinationQuery, toNetwork?.id, toNetwork?.runtimeModelId])

  useEffect(() => {
    setQuote(null)
    setExecution(null)
    setToAmount('')
    setErrorText('')
    setSelectionHint('')
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

    const sourceRpcConfig = createServerExecutionRpcConfig(fromNetwork, {
      secureBridgeAddressResolver: resolveBackendAuthAddress,
      secureBridgeSigner: signBackendAuthMessage
    })
    const destinationRpcConfig = createServerExecutionRpcConfig(toNetwork, {
      secureBridgeAddressResolver: resolveBackendAuthAddress,
      secureBridgeSigner: signBackendAuthMessage
    })
    const sourceAssetBase = toServerSwapAsset(fromItem, fromNetwork.id)
    const destinationAssetBase = toServerSwapAsset(toItem, toNetwork.id)
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
      sourceAsset,
      destinationAsset
    }
  }

  const requestQuote = async (
    mode: QuoteRequestMode,
    options?: { suppressErrors?: boolean; suppressSuccess?: boolean }
  ) => {
    const requestId = ++latestQuoteRequestRef.current
    setIsQuoting(true)
    if (mode === 'manual') {
      setErrorText('')
    }
    try {
      const { rpcConfig, sourceAddress, destinationAddress, sourceAsset, destinationAsset } = await buildSwapContext()
      const slippage = Number(slippagePct)
      const destinationCandidates = findSwapAssetAliasOptions(toItem, toOptions, toNetwork!)
      const destinationRpcConfig = createServerExecutionRpcConfig(toNetwork!, {
        secureBridgeAddressResolver: resolveBackendAuthAddress,
        secureBridgeSigner: signBackendAuthMessage
      })
      let nextQuote: ServerSwapQuote | null = null
      let selectedDestination = toItem
      let lastError: unknown = null

      for (const candidate of destinationCandidates) {
        try {
          const candidateAsset = await withResolvedSwapAsset(
            toNetwork!,
            destinationRpcConfig,
            toServerSwapAsset(candidate, toNetwork!.id)
          )
          nextQuote = await requestServerSwapQuote(rpcConfig, {
            source: {
              networkId: fromNetwork!.id,
              chainId: fromNetwork!.chainId,
              symbol: fromItem?.symbol || fromNetwork!.symbol,
              address: sourceAddress,
              amount: fromAmount,
              asset: sourceAsset
            },
            destination: {
              networkId: toNetwork!.id,
              chainId: toNetwork!.chainId,
              symbol: candidate.symbol || toNetwork!.symbol,
              address: destinationAddress,
              asset: candidateAsset || destinationAsset
            },
            slippageBps: Number.isFinite(slippage) ? Math.max(1, Math.round(slippage * 100)) : 50,
            sponsorPreference
          })
          selectedDestination = candidate
          break
        } catch (error) {
          lastError = error
          if (!isQuoteRouteAvailabilityError(error)) throw error
        }
      }

      if (!nextQuote) {
        throw lastError || new Error('No route is available for the selected swap')
      }
      if (latestQuoteRequestRef.current !== requestId) return

      if (selectedDestination && selectedDestination.id !== toAssetId) {
        setToAssetId(selectedDestination.id)
        const note = `Using ${selectedDestination.symbol} on ${toNetwork!.name} because no direct ${toItem?.symbol || toNetwork!.symbol} route was available.`
        setSelectionHint(note)
        if (mode === 'manual') showToast(note, 'info')
      } else {
        setSelectionHint('')
      }

      lastResolvedQuoteKeyRef.current = quotePreviewKey
      setQuote(nextQuote)
      setToAmount(nextQuote.destinationAmount)
      setErrorText('')
      if (!options?.suppressSuccess) {
        showToast(`Swap quote ready: ${nextQuote.mode}`, 'success')
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

    setIsSubmitting(true)
    setErrorText('')
    try {
      const { rpcConfig, sourceAddress, destinationAddress, sourceAsset, destinationAsset } = await buildSwapContext()
      const submitted = await submitServerSwap(rpcConfig, {
        quoteId: quote.quoteId,
        source: {
          networkId: fromNetwork.id,
          chainId: fromNetwork.chainId,
          symbol: fromItem.symbol || fromNetwork.symbol,
          address: sourceAddress,
          amount: fromAmount,
          asset: sourceAsset
        },
        destination: {
          networkId: toNetwork.id,
          chainId: toNetwork.chainId,
          symbol: toItem.symbol || toNetwork.symbol,
          address: destinationAddress,
          asset: destinationAsset
        },
        minDestinationAmount: quote.minDestinationAmount,
        sponsorPreference,
        executionMode: quote.mode,
        quoteMetadata: quote.metadata
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
    setFromNetworkFilter(toNetwork ? resolveSwapNetworkSegment(toNetwork) : 'all')
    setToNetworkFilter(fromNetwork ? resolveSwapNetworkSegment(fromNetwork) : 'all')
    if (prevToAmount) setFromAmount(prevToAmount)
  }

  useEffect(() => {
    if (!canRequestQuote || isSubmitting) return
    if (
      quote
      && lastResolvedQuoteKeyRef.current === quotePreviewKey
      && quote.expiresAt > Date.now() + 8_000
    ) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      void requestQuote('auto', {
        suppressErrors: true,
        suppressSuccess: true
      })
    }, 550)

    return () => window.clearTimeout(timeoutId)
  }, [canRequestQuote, quote, quotePreviewKey, isSubmitting])

  const quoteStatusText = quote
    ? `${formatModeLabel(quote.mode)} route ready`
    : (isQuoting && canRequestQuote
        ? 'Finding the best route and receive amount'
        : 'Enter an amount to preview the receive amount')
  const rateText = quote
    ? `1 ${quote.sourceSymbol || fromItem?.symbol || fromNetwork?.symbol || 'FROM'} = ${formatQuoteRate(quote)} ${quote.destinationSymbol || toItem?.symbol || toNetwork?.symbol || 'TO'}`
    : 'Live rate appears here once a route is found'

  return (
    <div className="flex h-full flex-col bg-dark-800">
      <header className="p-4 border-b border-dark-600 flex items-center gap-3">
        <button
          onClick={() => navigate('/wallet/assets')}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <IoArrowBackOutline className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-black uppercase tracking-widest text-gray-200 flex-1">Swap</h1>
        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-dark-700 transition-colors"
          title="Swap settings"
        >
          <IoSettingsOutline className="w-4.5 h-4.5 text-gray-400 hover:text-white" />
        </button>
      </header>

      <div className="border-b border-dark-600/60 p-4">
        <div className="rounded-2xl border border-primary/20 bg-[linear-gradient(135deg,rgba(249,115,22,0.12),rgba(15,23,42,0.15))] px-4 py-3">
          <div className="flex items-start gap-3">
            <IoInformationCircleOutline className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-gray-100">Live swap preview</p>
              <p className="text-[11px] text-gray-400">
                Quotes now refresh as you type, and you can narrow source and destination chains to L1, L2, or other runtimes before signing.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-4 space-y-4">
          <section className="space-y-3 rounded-2xl border border-dark-600 bg-dark-900/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">Chain Scope</p>
                <p className="mt-1 text-[11px] text-gray-500">Filter the route builder the same way most swap wallets do.</p>
              </div>
              <div className="rounded-full border border-dark-600 bg-dark-800/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
                {fromNetwork ? `${fromNetwork.name} ${formatNetworkSegment(fromNetwork)}` : 'Select source'}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">Pay network</span>
                <span className="text-[10px] text-gray-500">{sourceNetworkOptions.length} chains</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {CHAIN_SEGMENTS.map((segment) => (
                  <TogglePill
                    key={`from-${segment.id}`}
                    active={fromNetworkFilter === segment.id}
                    label={segment.label}
                    onClick={() => setFromNetworkFilter(segment.id)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">Receive network</span>
                <span className="text-[10px] text-gray-500">{destinationNetworkOptions.length} chains</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {CHAIN_SEGMENTS.map((segment) => (
                  <TogglePill
                    key={`to-${segment.id}`}
                    active={toNetworkFilter === segment.id}
                    label={segment.label}
                    onClick={() => setToNetworkFilter(segment.id)}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-dark-600 bg-dark-700/30 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Pay With</span>
              <div className="flex items-center gap-2">
                {fromNetwork ? (
                  <span className="rounded-full border border-dark-500 bg-dark-800/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-300">
                    {formatNetworkSegment(fromNetwork)}
                  </span>
                ) : null}
                <select
                  value={fromNetworkId}
                  onChange={(event) => setFromNetworkId(event.target.value)}
                  className="rounded-lg border border-dark-600 bg-dark-700 px-2.5 py-1.5 text-[11px] font-bold text-gray-200 outline-none"
                >
                  {sourceNetworkOptions.map((network) => (
                    <option key={network.id} value={network.id}>{network.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
              <input
                type="number"
                placeholder="0.0"
                value={fromAmount}
                onChange={(event) => setFromAmount(event.target.value)}
                className="w-full bg-transparent text-[30px] font-bold tracking-tight text-white outline-none placeholder:text-gray-600"
              />
              <select
                value={fromAssetId}
                onChange={(event) => setFromAssetId(event.target.value)}
                className="min-w-[140px] px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-sm font-bold text-gray-200 outline-none"
              >
                {fromOptions.map((item) => (
                  <option key={item.id} value={item.id}>{formatAssetOption(item)}</option>
                ))}
              </select>
            </div>

            {fromQuickPicks.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">Popular</span>
                  <span className="text-[10px] text-gray-500">Quick token picks</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {fromQuickPicks.map((item) => (
                    <AssetQuickPick
                      key={`from-quick-${item.id}`}
                      active={item.id === fromAssetId}
                      option={item}
                      onClick={() => setFromAssetId(item.id)}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-between text-[11px] text-gray-500">
              <span>Available</span>
              <button
                type="button"
                onClick={() => setFromAmount(fromBalance)}
                className="font-medium text-gray-300 hover:text-white transition-colors"
              >
                {fromBalance} {fromItem?.symbol || fromNetwork?.symbol}
              </button>
            </div>
          </section>

          <div className="flex justify-center -my-1">
            <button
              type="button"
              onClick={flipSwapDirection}
              className="w-10 h-10 rounded-full border border-dark-600 bg-dark-700 flex items-center justify-center text-gray-300 hover:text-white hover:bg-dark-600 transition-colors"
              title="Switch assets and networks"
            >
              <IoSwapVerticalOutline className="w-4.5 h-4.5" />
            </button>
          </div>

          <section className="rounded-2xl border border-dark-600 bg-dark-700/30 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Receive</span>
              <div className="flex items-center gap-2">
                {toNetwork ? (
                  <span className="rounded-full border border-dark-500 bg-dark-800/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-300">
                    {formatNetworkSegment(toNetwork)}
                  </span>
                ) : null}
                <select
                  value={toNetworkId}
                  onChange={(event) => setToNetworkId(event.target.value)}
                  className="rounded-lg border border-dark-600 bg-dark-700 px-2.5 py-1.5 text-[11px] font-bold text-gray-200 outline-none"
                >
                  {destinationNetworkOptions.map((network) => (
                    <option key={network.id} value={network.id}>{network.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
              <div>
                <div className="text-[30px] font-bold tracking-tight text-white">
                  {quote ? toAmount || '0.0' : (isQuoting && canRequestQuote ? '...' : '0.0')}
                </div>
                <p className="mt-1 text-[11px] text-gray-500">
                  {quoteStatusText}
                </p>
              </div>
              <select
                value={toAssetId}
                onChange={(event) => setToAssetId(event.target.value)}
                className="min-w-[140px] px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-sm font-bold text-gray-200 outline-none"
              >
                {toOptions.map((item) => (
                  <option key={item.id} value={item.id}>{formatAssetOption(item)}</option>
                ))}
              </select>
            </div>

            {toQuickPicks.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">Most swapped</span>
                  <span className="text-[10px] text-gray-500">Quick token picks</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {toQuickPicks.map((item) => (
                    <AssetQuickPick
                      key={`to-quick-${item.id}`}
                      active={item.id === toAssetId}
                      option={item}
                      onClick={() => setToAssetId(item.id)}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <input
              type="text"
              placeholder="Search asset to receive"
              value={destinationQuery}
              onChange={(event) => setDestinationQuery(event.target.value)}
              className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2.5 text-sm text-gray-200 outline-none placeholder:text-gray-500"
            />
          </section>

          <section className="overflow-hidden rounded-2xl border border-dark-600 bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(2,6,23,0.9))]">
            <div className="px-4 py-3 border-b border-dark-600/60 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Quote Preview</p>
                <p className="text-[11px] text-gray-500">Best route, effective rate, fees, and expiry.</p>
              </div>
              {quote ? (
                <span className="rounded-full px-2 py-0.5 border border-primary/30 bg-primary/10 text-[9px] font-bold uppercase text-orange-200">
                  {formatModeLabel(quote.mode)}
                </span>
              ) : isQuoting && canRequestQuote ? (
                <span className="rounded-full px-2 py-0.5 border border-blue-500/30 bg-blue-500/10 text-[9px] font-bold uppercase text-blue-200">
                  Updating
                </span>
              ) : null}
            </div>

            {showAdvanced ? (
              <div className="px-4 pt-3 grid grid-cols-2 gap-3">
                <label className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Slippage</span>
                  <select
                    value={slippagePct}
                    onChange={(event) => setSlippagePct(event.target.value)}
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-xs font-bold text-gray-200 outline-none"
                  >
                    <option value="0.3">0.3%</option>
                    <option value="0.5">0.5%</option>
                    <option value="1">1.0%</option>
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Sponsor</span>
                  <select
                    value={sponsorPreference}
                    onChange={(event) => setSponsorPreference(event.target.value as ServerSponsorPreference)}
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-xs font-bold text-gray-200 outline-none"
                  >
                    <option value="preferred">Preferred</option>
                    <option value="required">Required</option>
                    <option value="never">Never</option>
                  </select>
                </label>
              </div>
            ) : null}

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-dark-600 bg-dark-800/80 p-3">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">
                    <IoTrendingUpOutline className="h-3.5 w-3.5" />
                    Effective Rate
                  </div>
                  <p className="mt-2 text-sm font-bold text-gray-100">{rateText}</p>
                </div>
                <div className="rounded-2xl border border-dark-600 bg-dark-800/80 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">Minimum Received</div>
                  <p className="mt-2 text-sm font-bold text-gray-100">
                    {quote ? `${quote.minDestinationAmount} ${quote.destinationSymbol || toItem?.symbol || toNetwork?.symbol || ''}` : '--'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
              <DetailRow
                label="Route"
                value={quote?.routeSummary || 'Waiting for a route preview'}
                subdued={!quote}
              />
              <DetailRow
                label="Source chain"
                value={fromNetwork ? `${fromNetwork.name} (${formatNetworkSegment(fromNetwork)})` : '--'}
                subdued={!fromNetwork}
              />
              <DetailRow
                label="Destination chain"
                value={toNetwork ? `${toNetwork.name} (${formatNetworkSegment(toNetwork)})` : '--'}
                subdued={!toNetwork}
              />
              <DetailRow
                label="Network fee"
                value={quote
                  ? (quote.sponsorCoversNetworkFee
                      ? 'Sponsored by route'
                      : (quote.estimatedNetworkFee
                          ? `${quote.estimatedNetworkFee} ${quote.estimatedNetworkFeeSymbol || fromItem?.symbol || fromNetwork?.symbol || ''}`.trim()
                          : 'User-paid route'))
                  : '--'}
                subdued={!quote}
              />
              <DetailRow
                label="Server fee"
                value={quote?.estimatedServerFee || '--'}
                subdued={!quote}
              />
              <DetailRow
                label="Price impact"
                value={quote?.priceImpactPct === null || quote?.priceImpactPct === undefined ? '--' : `${quote.priceImpactPct}%`}
                subdued={!quote}
              />
              <DetailRow
                label="Expires"
                value={quote ? (
                  <span className="inline-flex items-center gap-1">
                    <IoTimeOutline className="w-3.5 h-3.5" />
                    {formatExpiry(quote.expiresAt)}
                  </span>
                ) : '--'}
                subdued={!quote}
              />
              </div>
            </div>
          </section>

          {selectionHint ? (
            <section className="rounded-2xl border border-blue-500/25 bg-blue-500/10 p-3">
              <div className="flex items-start gap-2">
                <IoInformationCircleOutline className="w-4 h-4 text-blue-200 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-100/90">{selectionHint}</p>
              </div>
            </section>
          ) : null}

          {quote?.warnings.length ? (
            <section className="rounded-2xl border border-yellow-500/25 bg-yellow-500/10 p-3 space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-yellow-200">Warnings</p>
              {quote.warnings.map((warning) => (
                <p key={warning} className="text-[11px] text-yellow-100/90">{warning}</p>
              ))}
            </section>
          ) : null}

          {execution ? (
            <section className="rounded-2xl border border-dark-600 bg-dark-800/60 p-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-300">Execution Status</p>
                <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${
                  execution.status === 'confirmed'
                    ? 'border-green-500/40 bg-green-500/10 text-green-200'
                    : execution.status === 'failed' || execution.status === 'rejected' || execution.status === 'expired'
                      ? 'border-red-500/40 bg-red-500/10 text-red-200'
                      : 'border-blue-500/40 bg-blue-500/10 text-blue-200'
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
            <section className="rounded-2xl border border-red-500/25 bg-red-500/10 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-red-200">Could Not Continue</p>
              <p className="mt-1 text-[11px] text-red-100/90">{errorText}</p>
            </section>
          ) : null}
        </div>
      </div>

      <div className="p-4 border-t border-dark-600/60 bg-dark-800 space-y-3">
        <div className="rounded-xl border border-dark-600 bg-dark-700/30 px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">Swap Summary</p>
              <p className="mt-1 text-sm font-bold text-gray-200">
                {formatAssetLabel(fromItem, fromNetwork?.symbol)} {'->'} {formatAssetLabel(toItem, toNetwork?.symbol)}
              </p>
              <p className="mt-1 text-[11px] text-gray-500">
                {fromNetwork?.name || 'Source'} {'->'} {toNetwork?.name || 'Destination'}
              </p>
            </div>
            {quote ? (
              <span className="text-[10px] font-medium text-gray-400 text-right">
                {quote.sourceAmount} {quote.sourceSymbol || fromItem?.symbol} {'->'} {quote.destinationAmount} {quote.destinationSymbol || toItem?.symbol}
              </span>
            ) : null}
          </div>
        </div>

        {quote ? (
          <Button
            className="w-full"
            onClick={submitQuote}
            isLoading={isSubmitting}
            disabled={!quote || isQuoting || isSameAssetPair}
          >
            Review and sign
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={() => { void requestQuote('manual') }}
            isLoading={isQuoting}
            disabled={!canRequestQuote}
          >
            {isQuoting ? 'Previewing best route' : 'Preview quote'}
          </Button>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => { void requestQuote('manual', { suppressSuccess: false }) }}
          isLoading={isQuoting}
          disabled={!canRequestQuote || isSubmitting}
        >
          {quote ? 'Refresh quote' : 'Force refresh preview'}
        </Button>
      </div>
    </div>
  )
}

export default Swap
