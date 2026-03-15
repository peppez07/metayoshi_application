import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IoArrowBackOutline, IoChevronDownOutline, IoFlashOutline, IoInformationCircleOutline, IoTimeOutline } from 'react-icons/io5'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { useToast } from '../../components/Toast'
import type { ServerCoinCatalogItem } from '../../coins/serverRegistry/types'
import { searchMetayoshiServerCatalogAssets } from '../../lib/catalogDb/repository'
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
import { getEnabledNetworks } from '../../lib/networkVisibility'
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

const Swap: React.FC = () => {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const finalizedExecutionsRef = useRef<Set<string>>(new Set())
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

  const fromNetwork = enabledNetworks.find((network) => network.id === fromNetworkId) || enabledNetworks[0]
  const toNetwork = enabledNetworks.find((network) => network.id === toNetworkId) || enabledNetworks[0] || null

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

  useEffect(() => {
    if (!enabledNetworks.length) return
    const activeOrFallback = activeNetworkId || enabledNetworks[0]?.id || ''
    if (activeOrFallback && fromNetworkId !== activeOrFallback) {
      setFromNetworkId(activeOrFallback)
    }
    if (!toNetworkId) {
      const destinationFallback = enabledNetworks.find((network) => network.id !== activeOrFallback)?.id || activeOrFallback
      setToNetworkId(destinationFallback)
    }
  }, [enabledNetworks, activeNetworkId, fromNetworkId, toNetworkId])

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
          query: destinationQuery,
          networkId: toNetwork.id,
          runtimeModelId,
          includeMain: true,
          maxResults: destinationQuery ? 24 : 12
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
  }, [destinationQuery, toNetwork?.id, toNetwork?.runtimeModelId])

  useEffect(() => {
    setQuote(null)
    setExecution(null)
    setToAmount('')
    setErrorText('')
    setSelectionHint('')
  }, [fromAmount, fromNetworkId, toNetworkId, fromAssetId, toAssetId, slippagePct, sponsorPreference])

  useEffect(() => {
    if (!execution || !fromNetwork || isTerminalServerExecutionStatus(execution.status)) return

    let cancelled = false
    const rpcConfig = createServerExecutionRpcConfig(fromNetwork, {
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
  }, [execution, fromNetwork, signBackendAuthMessage])

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

    const sourceAddress = String(await ensureNetworkAddress(fromNetwork.id) || '').trim()
    if (!sourceAddress) throw new Error(`Could not derive a ${fromNetwork.symbol} source address`)

    const destinationAddress = String(await ensureNetworkAddress(toNetwork.id) || '').trim()
    if (!destinationAddress) throw new Error(`Could not derive a ${toNetwork.symbol} destination address`)

    const sourceRpcConfig = createServerExecutionRpcConfig(fromNetwork)
    const destinationRpcConfig = createServerExecutionRpcConfig(toNetwork)
    const sourceAssetBase = toServerSwapAsset(fromItem, fromNetwork.id)
    const destinationAssetBase = toServerSwapAsset(toItem, toNetwork.id)
    const [sourceAsset, destinationAsset] = await Promise.all([
      withResolvedSwapAsset(fromNetwork, sourceRpcConfig, sourceAssetBase),
      withResolvedSwapAsset(toNetwork, destinationRpcConfig, destinationAssetBase)
    ])

    return {
      rpcConfig: createServerExecutionRpcConfig(fromNetwork, {
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

  const requestQuote = async () => {
    setIsQuoting(true)
    setErrorText('')
    try {
      const { rpcConfig, sourceAddress, destinationAddress, sourceAsset, destinationAsset } = await buildSwapContext()
      const slippage = Number(slippagePct)
      const destinationCandidates = findSwapAssetAliasOptions(toItem, toOptions, toNetwork!)
      const destinationRpcConfig = createServerExecutionRpcConfig(toNetwork!)
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
              asset: candidateAsset
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

      if (selectedDestination && selectedDestination.id !== toAssetId) {
        setToAssetId(selectedDestination.id)
        const note = `Using ${selectedDestination.symbol} on ${toNetwork!.name} because no direct ${toItem?.symbol || toNetwork!.symbol} route was available.`
        setSelectionHint(note)
        showToast(note, 'info')
      } else {
        setSelectionHint('')
      }

      setQuote(nextQuote)
      setToAmount(nextQuote.destinationAmount)
      showToast(`Swap quote ready: ${nextQuote.mode}`, 'success')
    } catch (error) {
      const message = formatSwapUiError(error)
      setErrorText(message)
      setQuote(null)
      setToAmount('')
      showToast(message, 'error')
    } finally {
      setIsQuoting(false)
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

  return (
    <div className="flex flex-col h-full bg-dark-800">
      <header className="p-4 border-b border-dark-600 flex items-center gap-3">
        <button
          onClick={() => navigate('/wallet/assets')}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <IoArrowBackOutline className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-black uppercase tracking-widest text-gray-200 flex-1">Swap</h1>
      </header>

      <div className="p-4 border-b border-dark-600/60 space-y-3">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5">
          <div className="flex items-start gap-2">
            <IoInformationCircleOutline className="w-4 h-4 text-red-300 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-red-200">Server-mediated swap</p>
              <p className="text-[11px] text-red-100/90">
                This flow uses the MetaYoshi server swap routes for every network the server exposes. Legacy fallback execution remains EVM-only.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
        <div className="p-4 space-y-4">
          <section className="rounded-2xl border border-dark-600 bg-dark-700/30 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Pay With</span>
              <span className="text-[10px] text-gray-500">{fromNetwork?.name || 'Current network'}</span>
            </div>
            <select
              value={fromAssetId}
              onChange={(event) => setFromAssetId(event.target.value)}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-sm font-bold text-gray-200"
            >
              {fromOptions.map((item) => (
                <option key={item.id} value={item.id}>{formatAssetOption(item)}</option>
              ))}
            </select>
            <div className="space-y-2">
              <Input
                type="number"
                placeholder="0.0"
                value={fromAmount}
                onChange={(event) => setFromAmount(event.target.value)}
                className="w-full bg-dark-800 border-dark-600 text-base"
              />
              <div className="flex items-center justify-between text-[11px] text-gray-500">
                <span>Available</span>
                <span>{fromBalance} {fromItem?.symbol || fromNetwork?.symbol}</span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-dark-600 bg-dark-700/30 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Receive</span>
              <span className="text-[10px] text-gray-500">{quote ? 'Quote ready' : 'Choose network and asset'}</span>
            </div>
            <label className="space-y-1.5 block">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">Network</span>
              <select
                value={toNetworkId}
                onChange={(event) => setToNetworkId(event.target.value)}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-sm font-bold text-gray-200"
              >
                {enabledNetworks.map((network) => (
                  <option key={network.id} value={network.id}>{network.name}</option>
                ))}
              </select>
            </label>
            <Input
              type="text"
              placeholder="Search asset to receive"
              value={destinationQuery}
              onChange={(event) => setDestinationQuery(event.target.value)}
              className="w-full bg-dark-800 border-dark-600"
            />
            <select
              value={toAssetId}
              onChange={(event) => setToAssetId(event.target.value)}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-sm font-bold text-gray-200"
            >
              {toOptions.map((item) => (
                <option key={item.id} value={item.id}>{formatAssetOption(item)}</option>
              ))}
            </select>
            <div className="rounded-xl border border-dark-600 bg-dark-800/60 px-3 py-2">
              <p className="text-[11px] text-gray-400">
                Funds are sent to your active MetaYoshi wallet address on the selected network. No manual destination address is needed here.
              </p>
            </div>
            <div className="rounded-xl border border-dark-600 bg-dark-800/80 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500 mb-1">Estimated You Receive</p>
              <p className="text-sm font-bold text-gray-200">
                {toAmount || '--'} {quote?.destinationSymbol || toItem?.symbol || toNetwork?.symbol || ''}
              </p>
            </div>
            {selectionHint ? (
              <div className="rounded-xl border border-blue-500/25 bg-blue-500/10 px-3 py-2 flex items-start gap-2">
                <IoInformationCircleOutline className="w-4 h-4 text-blue-200 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-100/90">{selectionHint}</p>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-dark-600 bg-dark-900/40 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-dark-700/30 transition-colors"
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Advanced</p>
                <p className="text-[11px] text-gray-500">Slippage and sponsorship preferences</p>
              </div>
              <IoChevronDownOutline className={`w-4 h-4 text-gray-500 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>
            {showAdvanced && (
              <div className="px-4 pb-4 space-y-3 border-t border-dark-600/60">
                <div className="grid grid-cols-2 gap-3 pt-3">
                  <label className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Slippage</span>
                    <select
                      value={slippagePct}
                      onChange={(event) => setSlippagePct(event.target.value)}
                      className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-xs font-bold text-gray-200"
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
                      className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-xs font-bold text-gray-200"
                    >
                      <option value="preferred">Preferred</option>
                      <option value="required">Required</option>
                      <option value="never">Never</option>
                    </select>
                  </label>
                </div>
                <div className="rounded-xl border border-dark-600 bg-dark-700/30 px-3 py-2 flex items-start gap-2">
                  <IoInformationCircleOutline className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-gray-500">
                    `Preferred` picks the cheapest eligible route. `Required` only allows sponsored paths. `Never` asks for a standard user-paid route when available.
                  </p>
                </div>
              </div>
            )}
          </section>

        {quote ? (
          <section className="rounded-2xl border border-primary/25 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">Review Quote</p>
                <p className="text-xs font-bold text-gray-200">{quote.routeSummary}</p>
              </div>
              <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase text-orange-200">
                {quote.mode}
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Expected output</span>
                <span className="font-bold text-gray-200">{quote.destinationAmount} {quote.destinationSymbol || toItem?.symbol || toNetwork?.symbol}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Minimum output</span>
                <span className="font-bold text-gray-200">{quote.minDestinationAmount} {quote.destinationSymbol || toItem?.symbol || toNetwork?.symbol}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Network fee</span>
                <span className="font-bold text-gray-200">
                  {quote.sponsorCoversNetworkFee
                    ? 'Sponsored by server route'
                    : (quote.estimatedNetworkFee
                      ? `${quote.estimatedNetworkFee} ${quote.estimatedNetworkFeeSymbol || fromItem?.symbol || fromNetwork?.symbol || ''}`.trim()
                      : 'User-paid route')}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Server fee</span>
                <span className="font-bold text-gray-200">{quote.estimatedServerFee || 'Included in route'}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Price impact</span>
                <span className="font-bold text-gray-200">
                  {quote.priceImpactPct === null || quote.priceImpactPct === undefined ? 'n/a' : `${quote.priceImpactPct}%`}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500 flex items-center gap-1">
                  <IoTimeOutline className="w-3.5 h-3.5" />
                  Expires
                </span>
                <span className="font-bold text-gray-200">{formatExpiry(quote.expiresAt)}</span>
              </div>
            </div>
            {quote.warnings.length > 0 ? (
              <div className="rounded-lg border border-yellow-500/25 bg-yellow-500/10 p-3 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-yellow-200">Warnings</p>
                {quote.warnings.map((warning) => (
                  <p key={warning} className="text-[11px] text-yellow-100/90">{warning}</p>
                ))}
              </div>
            ) : null}
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
            <div className="space-y-1 text-xs">
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Execution id</span>
                <span className="font-bold text-gray-200">{execution.executionId}</span>
              </div>
              {execution.receipt?.txid ? (
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500">Receipt txid</span>
                  <span className="font-bold text-gray-200 break-all text-right">{execution.receipt.txid}</span>
                </div>
              ) : null}
              {execution.detail ? (
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500">Detail</span>
                  <span className="font-bold text-gray-200 text-right">{execution.detail}</span>
                </div>
              ) : null}
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

        <div className="mt-auto p-4 border-t border-dark-600/60 flex flex-col gap-3 bg-dark-800">
          <div className="rounded-xl border border-dark-600 bg-dark-700/30 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">Swap Summary</p>
            <p className="mt-1 text-sm font-bold text-gray-200">
              {formatAssetLabel(fromItem, fromNetwork?.symbol)} {'->'} {formatAssetLabel(toItem, toNetwork?.symbol)}
            </p>
          </div>
          <Button
            className="w-full btn-secondary"
            onClick={requestQuote}
            isLoading={isQuoting}
            disabled={!fromAmount || !fromItem || !toItem || Number(fromAmount) <= 0 || isSameAssetPair}
          >
            Get Quote
          </Button>
          <Button
            className="w-full btn-primary"
            onClick={submitQuote}
            isLoading={isSubmitting}
            disabled={!quote || isQuoting || isSameAssetPair}
          >
            Review And Sign
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Swap
