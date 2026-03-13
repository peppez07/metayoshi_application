import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IoArrowBack, IoSwapHorizontal, IoTimeOutline, IoFlashOutline } from 'react-icons/io5'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { useToast } from '../../components/Toast'
import type { ServerCoinCatalogItem } from '../../coins/serverRegistry/types'
import { searchMetayoshiServerCatalogAssets } from '../../lib/catalogDb/repository'
import {
  buildServerSwapApprovalMessage,
  createServerExecutionRpcConfig,
  fetchServerExecutionStatus,
  isTerminalServerExecutionStatus,
  requestServerSwapQuote,
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

function formatExpiry(expiresAt: number): string {
  const deltaMs = Math.max(0, expiresAt - Date.now())
  const seconds = Math.max(0, Math.round(deltaMs / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${minutes}m ${remainder}s`
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
    signBackendAuthMessage,
    addActivity,
    refreshActiveBalance,
    getSendableItems
  } = useWalletStore()

  const enabledNetworks = getEnabledNetworks(networks, disabledNetworkIds)
  const activeAccount = accounts.find((account) => account.id === activeAccountId) || accounts[0]
  const initialNetworkId = activeNetworkId || enabledNetworks[0]?.id || ''

  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [fromNetworkId, setFromNetworkId] = useState(initialNetworkId)
  const [toNetworkId, setToNetworkId] = useState(initialNetworkId)
  const [fromAssetId, setFromAssetId] = useState('')
  const [toAssetId, setToAssetId] = useState('')
  const [destinationQuery, setDestinationQuery] = useState('')
  const [catalogDestinationItems, setCatalogDestinationItems] = useState<SwapAssetOption[]>([])
  const [slippagePct, setSlippagePct] = useState('0.5')
  const [sponsorPreference, setSponsorPreference] = useState<ServerSponsorPreference>('preferred')
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
    if (!fromNetworkId && enabledNetworks[0]?.id) setFromNetworkId(enabledNetworks[0].id)
    if (!toNetworkId && enabledNetworks[0]?.id) setToNetworkId(enabledNetworks[0].id)
  }, [enabledNetworks, fromNetworkId, toNetworkId])

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
  }, [fromAmount, fromNetworkId, toNetworkId, fromAssetId, toAssetId, slippagePct, sponsorPreference])

  useEffect(() => {
    if (!execution || !fromNetwork || isTerminalServerExecutionStatus(execution.status)) return

    let cancelled = false
    const rpcConfig = createServerExecutionRpcConfig(fromNetwork, signBackendAuthMessage)
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

  const swapAssets = () => {
    const nextFromNetworkId = toNetworkId || fromNetworkId
    const nextToNetworkId = fromNetworkId
    const nextFromAssetId = toAssetId || fromAssetId
    const nextToAssetId = fromAssetId
    setFromNetworkId(nextFromNetworkId)
    setToNetworkId(nextToNetworkId)
    setFromAssetId(nextFromAssetId)
    setToAssetId(nextToAssetId)
    setFromAmount(toAmount)
    setToAmount(fromAmount)
  }

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

    return {
      rpcConfig: createServerExecutionRpcConfig(fromNetwork, signBackendAuthMessage),
      sourceAddress,
      destinationAddress,
      sourceAsset: toServerSwapAsset(fromItem, fromNetwork.id),
      destinationAsset: toServerSwapAsset(toItem, toNetwork.id)
    }
  }

  const requestQuote = async () => {
    setIsQuoting(true)
    setErrorText('')
    try {
      const { rpcConfig, sourceAddress, destinationAddress, sourceAsset, destinationAsset } = await buildSwapContext()
      const slippage = Number(slippagePct)
      const nextQuote = await requestServerSwapQuote(rpcConfig, {
        source: {
          networkId: fromNetwork!.id,
          symbol: fromItem?.symbol || fromNetwork!.symbol,
          address: sourceAddress,
          amount: fromAmount,
          asset: sourceAsset
        },
        destination: {
          networkId: toNetwork!.id,
          symbol: toItem?.symbol || toNetwork!.symbol,
          address: destinationAddress,
          asset: destinationAsset
        },
        slippageBps: Number.isFinite(slippage) ? Math.max(1, Math.round(slippage * 100)) : 50,
        sponsorPreference
      })
      setQuote(nextQuote)
      setToAmount(nextQuote.destinationAmount)
      showToast(`Server quote ready: ${nextQuote.mode}`, 'success')
    } catch (error) {
      const message = compactError(error)
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
      const nonce = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `swap-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

      const approvalMessage = buildServerSwapApprovalMessage({
        quoteId: quote.quoteId,
        sourceNetworkId: fromNetwork.id,
        sourceSymbol: fromItem.symbol || fromNetwork.symbol,
        sourceAssetId: sourceAsset?.assetId,
        sourceAssetKind: sourceAsset?.kind,
        sourceContractAddress: sourceAsset?.contractAddress,
        sourceAddress,
        sourceAmount: fromAmount,
        destinationNetworkId: toNetwork.id,
        destinationSymbol: toItem.symbol || toNetwork.symbol,
        destinationAssetId: destinationAsset?.assetId,
        destinationAssetKind: destinationAsset?.kind,
        destinationContractAddress: destinationAsset?.contractAddress,
        destinationAddress,
        minDestinationAmount: quote.minDestinationAmount,
        sponsorPreference,
        executionMode: quote.mode,
        expiresAt: quote.expiresAt,
        nonce
      })
      const approval = await signBackendAuthMessage(approvalMessage)
      const submitted = await submitServerSwap(rpcConfig, {
        quoteId: quote.quoteId,
        source: {
          networkId: fromNetwork.id,
          symbol: fromItem.symbol || fromNetwork.symbol,
          address: sourceAddress,
          amount: fromAmount,
          asset: sourceAsset
        },
        destination: {
          networkId: toNetwork.id,
          symbol: toItem.symbol || toNetwork.symbol,
          address: destinationAddress,
          asset: destinationAsset
        },
        minDestinationAmount: quote.minDestinationAmount,
        sponsorPreference,
        executionMode: quote.mode,
        approval: {
          nonce,
          address: approval.address,
          message: approvalMessage,
          signature: approval.signature,
          signedAt: Date.now()
        }
      })
      setExecution(submitted)
      showToast('Swap submitted to server execution', 'info')
    } catch (error) {
      const message = compactError(error)
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
          <IoArrowBack className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-sm font-black uppercase tracking-widest text-gray-200">Server Swap</h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-[0.16em]">Quote, sign, submit through bridge API</p>
        </div>
      </header>

      <div className="flex-1 flex flex-col p-6 space-y-5 overflow-y-auto custom-scrollbar">
        <section className="rounded-2xl border border-primary/25 bg-gradient-to-br from-dark-700/90 to-dark-900 p-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
              <IoFlashOutline className="w-4 h-4" />
              Server-Mediated Execution
            </div>
            <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase text-orange-200">
              Non-custodial
            </span>
          </div>
          <p className="text-[11px] text-gray-400">
            The wallet signs bounded approval for the selected asset pair. The server chooses the route and can sponsor network fees when the policy allows it.
          </p>
        </section>

        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-dark-600 bg-dark-700/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400 uppercase">From</span>
              <span className="text-[10px] text-gray-500">Balance: {fromBalance}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={fromNetworkId}
                onChange={(event) => setFromNetworkId(event.target.value)}
                className="px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-xs font-bold text-gray-200"
              >
                {enabledNetworks.map((network) => (
                  <option key={network.id} value={network.id}>{network.symbol}</option>
                ))}
              </select>
              <select
                value={fromAssetId}
                onChange={(event) => setFromAssetId(event.target.value)}
                className="px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-xs font-bold text-gray-200"
              >
                {fromOptions.map((item) => (
                  <option key={item.id} value={item.id}>{formatAssetOption(item)}</option>
                ))}
              </select>
            </div>
            <Input
              type="number"
              placeholder="0.0"
              value={fromAmount}
              onChange={(event) => setFromAmount(event.target.value)}
              className="w-full bg-dark-800 border-dark-600"
            />
          </div>

          <div className="flex justify-center -my-2">
            <button
              onClick={swapAssets}
              className="p-2 bg-dark-700 border border-dark-600 rounded-full hover:bg-dark-600 transition-colors"
            >
              <IoSwapHorizontal className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="p-4 rounded-xl border border-dark-600 bg-dark-700/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400 uppercase">To</span>
              <span className="text-[10px] text-gray-500">{quote ? 'Quoted by server' : 'Waiting for quote'}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={toNetworkId}
                onChange={(event) => setToNetworkId(event.target.value)}
                className="px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-xs font-bold text-gray-200"
              >
                {enabledNetworks.map((network) => (
                  <option key={network.id} value={network.id}>{network.symbol}</option>
                ))}
              </select>
              <select
                value={toAssetId}
                onChange={(event) => setToAssetId(event.target.value)}
                className="px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-xs font-bold text-gray-200"
              >
                {toOptions.map((item) => (
                  <option key={item.id} value={item.id}>{formatAssetOption(item)}</option>
                ))}
              </select>
            </div>
            <Input
              type="text"
              placeholder="Search destination assets from server catalog"
              value={destinationQuery}
              onChange={(event) => setDestinationQuery(event.target.value)}
              className="w-full bg-dark-800 border-dark-600"
            />
            <Input
              type="number"
              placeholder="0.0"
              value={toAmount}
              onChange={(event) => setToAmount(event.target.value)}
              className="w-full bg-dark-800 border-dark-600"
              readOnly
            />
          </div>
        </div>

        <section className="rounded-xl border border-dark-600 bg-dark-900/50 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
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
          <p className="text-[11px] text-gray-500">
            `Preferred` lets the server choose the cheapest route. `Required` fails when sponsorship is unavailable. `Never` asks for a normal user-paid route if the backend supports one.
          </p>
        </section>

        {quote ? (
          <section className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">Quote Ready</p>
                <p className="text-xs font-bold text-gray-200">{quote.routeSummary}</p>
              </div>
              <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase text-orange-200">
                {quote.mode}
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Expected output</span>
                <span className="font-bold text-gray-200">{quote.destinationAmount} {toItem?.symbol || toNetwork?.symbol}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Minimum output</span>
                <span className="font-bold text-gray-200">{quote.minDestinationAmount} {toItem?.symbol || toNetwork?.symbol}</span>
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
          <section className="rounded-xl border border-dark-600 bg-dark-800/60 p-4 space-y-2">
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
          <section className="rounded-xl border border-red-500/25 bg-red-500/10 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-red-200">Server Error</p>
            <p className="mt-1 text-[11px] text-red-100/90">{errorText}</p>
          </section>
        ) : null}

        <div className="mt-auto pt-2 flex flex-col gap-3">
          <Button
            className="w-full btn-secondary"
            onClick={requestQuote}
            isLoading={isQuoting}
            disabled={!fromAmount || !fromItem || !toItem || Number(fromAmount) <= 0 || isSameAssetPair}
          >
            Request Quote
          </Button>
          <Button
            className="w-full btn-primary"
            onClick={submitQuote}
            isLoading={isSubmitting}
            disabled={!quote || isQuoting || isSameAssetPair}
          >
            Sign And Submit
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Swap
