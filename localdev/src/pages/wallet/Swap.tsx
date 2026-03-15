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
import {
  buildSwappableCatalogIdentitySet,
  isCatalogAssetSwappable,
  isSwapSupportedNetwork,
  isWalletAssetSwappable
} from '../../lib/swapEligibility'
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

  if (
    normalized.includes('did not come from the metayoshi server swap service')
    || normalized.includes('only supports metayoshi server-managed swaps')
    || normalized.includes('metayoshi server swap service is unavailable')
  ) {
    return 'Swap is disabled until the MetaYoshi server swap service is available.'
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
      <span className={subdued ? 'text-slate-400' : 'text-slate-500'}>{label}</span>
      <span className="text-right font-semibold text-slate-900">{value}</span>
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
          ? 'border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700'
          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
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
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
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
  const [catalogSourceItems, setCatalogSourceItems] = useState<ServerCoinCatalogItem[]>([])
  const [catalogDestinationRows, setCatalogDestinationRows] = useState<ServerCoinCatalogItem[]>([])
  const [catalogDestinationItems, setCatalogDestinationItems] = useState<SwapAssetOption[]>([])
  const [slippagePct, setSlippagePct] = useState('0.5')
  const [sponsorPreference, setSponsorPreference] = useState<ServerSponsorPreference>('preferred')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [quote, setQuote] = useState<ServerSwapQuote | null>(null)
  const [execution, setExecution] = useState<ServerExecutionStatus | null>(null)
  const [isQuoting, setIsQuoting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorText, setErrorText] = useState('')

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
    const swappableCatalogIds = buildSwappableCatalogIdentitySet(catalogSourceItems, fromNetwork.id)
    return getSendableItems({
      accountId: activeAccount.id,
      networkId: fromNetwork.id,
      includeHidden: false,
      includeZeroBalance: false
    }).filter((item) => isWalletAssetSwappable(item, fromNetwork, swappableCatalogIds))
  }, [activeAccount?.id, catalogSourceItems, fromNetwork, getSendableItems])

  const walletToItems = useMemo(() => {
    if (!activeAccount?.id || !toNetwork?.id) return []
    const swappableCatalogIds = buildSwappableCatalogIdentitySet(catalogDestinationRows, toNetwork.id)
    return getSendableItems({
      accountId: activeAccount.id,
      networkId: toNetwork.id,
      includeHidden: true,
      includeZeroBalance: true
    }).filter((item) => isWalletAssetSwappable(item, toNetwork, swappableCatalogIds))
  }, [activeAccount?.id, catalogDestinationRows, toNetwork, getSendableItems])

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
    fromAmount
    && fromItem
    && toItem
    && Number(fromAmount) > 0
    && !isSameAssetPair
    && fromNetwork
    && toNetwork
  )
  const quotePreviewKey = useMemo(() => buildQuotePreviewKey({
    amount: fromAmount,
    fromNetworkId: fromNetworkId || '',
    toNetworkId: toNetworkId || '',
    fromAssetId: fromAssetId || '',
    toAssetId: toAssetId || '',
    slippagePct,
    sponsorPreference
  }), [fromAmount, fromNetworkId, toNetworkId, fromAssetId, toAssetId, slippagePct, sponsorPreference])

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
    if (!fromNetwork?.id || !isSwapSupportedNetwork(fromNetwork)) {
      setCatalogSourceItems([])
      return
    }

    void (async () => {
      try {
        const runtimeModelId = String(fromNetwork.runtimeModelId || '').trim() || null
        const rows = await searchMetayoshiServerCatalogAssets({
          networkId: fromNetwork.id,
          runtimeModelId,
          includeMain: true,
          maxResults: 60
        })
        if (cancelled) return
        setCatalogSourceItems(rows.filter((item) => isCatalogAssetSwappable(item, fromNetwork)))
      } catch (error) {
        if (cancelled) return
        console.warn('Failed to load source catalog assets', error)
        setCatalogSourceItems([])
      }
    })()

    return () => { cancelled = true }
  }, [fromNetwork])

  useEffect(() => {
    let cancelled = false
    if (!toNetwork?.id || !isSwapSupportedNetwork(toNetwork)) {
      setCatalogDestinationRows([])
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
        const filtered = rows.filter((item) => isCatalogAssetSwappable(item, toNetwork))
        setCatalogDestinationRows(filtered)
        setCatalogDestinationItems(filtered.map((item) => createCatalogAssetOption(item, toNetwork.id)))
      } catch (error) {
        if (cancelled) return
        console.warn('Failed to load destination catalog assets', error)
        setCatalogDestinationRows([])
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

  const requestQuote = async (options?: { suppressErrors?: boolean; suppressSuccess?: boolean }) => {
    const requestId = ++latestQuoteRequestRef.current
    setIsQuoting(true)
    setErrorText('')
    try {
      const { rpcConfig, sourceAddress, destinationAddress, sourceAsset, destinationAsset } = await buildSwapContext()
      const slippage = Number(slippagePct)
      const nextQuote = await requestServerSwapQuote(rpcConfig, {
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

  const swapUnavailable = !isSwapSupportedNetwork(fromNetwork) || fromOptions.length === 0
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
        ? 'Swap is available only when the server-backed route is supported for the selected asset and network.'
        : (isQuoting
        ? 'Requesting a quote from the MetaYoshi server.'
        : 'Select the pair and request a quote to preview the receive amount.')
  const rateText = quote
    ? `1 ${quote.sourceSymbol || fromItem?.symbol || fromNetwork?.symbol || 'FROM'} = ${formatQuoteRate(quote)} ${quote.destinationSymbol || toItem?.symbol || toNetwork?.symbol || 'TO'}`
    : 'Rate appears here after the server returns a quote'

  return (
    <div className="flex h-full flex-col bg-[#f5f7fb] text-slate-900">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4">
        <button
          onClick={() => navigate('/wallet/assets')}
          className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <IoArrowBackOutline className="w-5 h-5" />
        </button>
        <h1 className="text-[1.05rem] font-semibold tracking-tight text-slate-950">Swap</h1>
        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          title="Swap settings"
        >
          <IoSettingsOutline className="h-5 w-5" />
        </button>
      </header>

      <div className="border-b border-slate-200 px-4 py-3">
        <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-start gap-3">
            <IoInformationCircleOutline className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-500" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-900">Server-backed swap</p>
              <p className="text-[11px] text-slate-500">
                This screen now requests quotes only from the MetaYoshi server. Nothing is routed automatically and nothing is sent until you confirm.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="space-y-4 p-4">
          <section className="space-y-3 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Networks</p>
                <p className="mt-1 text-[11px] text-slate-500">Pick the source and destination chain scope before choosing tokens.</p>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
                {fromNetwork ? `${fromNetwork.name} ${formatNetworkSegment(fromNetwork)}` : 'Select source'}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Pay network</span>
                <span className="text-[10px] text-slate-500">{sourceNetworkOptions.length} chains</span>
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
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Receive network</span>
                <span className="text-[10px] text-slate-500">{destinationNetworkOptions.length} chains</span>
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

          <section className="space-y-3 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Sell</span>
              <div className="flex items-center gap-2">
                {fromNetwork ? (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
                    {formatNetworkSegment(fromNetwork)}
                  </span>
                ) : null}
                <select
                  value={fromNetworkId}
                  onChange={(event) => setFromNetworkId(event.target.value)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-700 outline-none"
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
                className="w-full bg-transparent text-[32px] font-semibold tracking-tight text-slate-950 outline-none placeholder:text-slate-300"
              />
              <select
                value={fromAssetId}
                onChange={(event) => setFromAssetId(event.target.value)}
                className="min-w-[140px] rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none"
              >
                {fromOptions.map((item) => (
                  <option key={item.id} value={item.id}>{formatAssetOption(item)}</option>
                ))}
              </select>
            </div>

            {fromQuickPicks.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Popular</span>
                  <span className="text-[10px] text-slate-500">Quick token picks</span>
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

            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Available</span>
              <button
                type="button"
                onClick={() => setFromAmount(fromBalance)}
                className="font-medium text-slate-700 transition-colors hover:text-slate-950"
              >
                {fromBalance} {fromItem?.symbol || fromNetwork?.symbol}
              </button>
            </div>
          </section>

          <div className="flex justify-center -my-1">
            <button
              type="button"
              onClick={flipSwapDirection}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              title="Switch assets and networks"
            >
              <IoSwapVerticalOutline className="w-4.5 h-4.5" />
            </button>
          </div>

          <section className="space-y-3 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Buy</span>
              <div className="flex items-center gap-2">
                {toNetwork ? (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
                    {formatNetworkSegment(toNetwork)}
                  </span>
                ) : null}
                <select
                  value={toNetworkId}
                  onChange={(event) => setToNetworkId(event.target.value)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-700 outline-none"
                >
                  {destinationNetworkOptions.map((network) => (
                    <option key={network.id} value={network.id}>{network.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
              <div>
                <div className="text-[32px] font-semibold tracking-tight text-slate-950">
                  {quote ? toAmount || '0.0' : (isQuoting && canRequestQuote ? '...' : '0.0')}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {quoteStatusText}
                </p>
              </div>
              <select
                value={toAssetId}
                onChange={(event) => setToAssetId(event.target.value)}
                className="min-w-[140px] rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none"
              >
                {toOptions.map((item) => (
                  <option key={item.id} value={item.id}>{formatAssetOption(item)}</option>
                ))}
              </select>
            </div>

            {toQuickPicks.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Most swapped</span>
                  <span className="text-[10px] text-slate-500">Quick token picks</span>
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
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
          </section>

          <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Quote Preview</p>
                <p className="text-[11px] text-slate-500">Server quote details, effective rate, fees, and expiry.</p>
              </div>
              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${
                swapStatus === 'Confirmed'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : swapStatus === 'Failed' || swapStatus === 'Unavailable'
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : swapStatus === 'Quote ready'
                      ? 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700'
                      : 'border-sky-200 bg-sky-50 text-sky-700'
              }`}>
                {swapStatus}
              </span>
            </div>

            {showAdvanced ? (
              <div className="grid grid-cols-2 gap-3 px-4 pt-3">
                <label className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Slippage</span>
                  <select
                    value={slippagePct}
                    onChange={(event) => setSlippagePct(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="0.3">0.3%</option>
                    <option value="0.5">0.5%</option>
                    <option value="1">1.0%</option>
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Sponsor</span>
                  <select
                    value={sponsorPreference}
                    onChange={(event) => setSponsorPreference(event.target.value as ServerSponsorPreference)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 outline-none"
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
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    <IoTrendingUpOutline className="h-3.5 w-3.5" />
                    Effective Rate
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{rateText}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Minimum Received</div>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {quote ? `${quote.minDestinationAmount} ${quote.destinationSymbol || toItem?.symbol || toNetwork?.symbol || ''}` : '--'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
              <DetailRow
                label="Route"
                value={quote?.routeSummary || 'Waiting for a server quote'}
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

          {quote?.warnings.length ? (
            <section className="space-y-1 rounded-2xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-700">Warnings</p>
              {quote.warnings.map((warning) => (
                <p key={warning} className="text-[11px] text-amber-800">{warning}</p>
              ))}
            </section>
          ) : null}

          {execution ? (
            <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Execution Status</p>
                <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${
                  execution.status === 'confirmed'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : execution.status === 'failed' || execution.status === 'rejected' || execution.status === 'expired'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-sky-200 bg-sky-50 text-sky-700'
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
            <section className="rounded-2xl border border-red-200 bg-red-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-red-700">Could Not Continue</p>
              <p className="mt-1 text-[11px] text-red-800">{errorText}</p>
            </section>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 border-t border-slate-200 bg-white p-4">
        <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Swap Summary</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {formatAssetLabel(fromItem, fromNetwork?.symbol)} {'->'} {formatAssetLabel(toItem, toNetwork?.symbol)}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                {fromNetwork?.name || 'Source'} {'->'} {toNetwork?.name || 'Destination'}
              </p>
            </div>
            {quote ? (
              <span className="text-right text-[10px] font-medium text-slate-500">
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
            {isQuoting ? 'Requesting quote' : 'Get quote'}
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
    </div>
  )
}

export default Swap
