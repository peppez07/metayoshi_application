import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useWalletStore, type SendableItem } from '../../store/walletStore'
import { Input } from '../../components/Input'
import SendTransferForm from '../../components/send/SendTransferForm'
import { resolveNetworkCapabilities } from '../../lib/networkCapabilities'
import { getAccountDisplayName } from '../../lib/accountName'
import {
  IoArrowBackOutline,
  IoChevronDownOutline,
  IoChevronForwardOutline,
  IoLayersOutline,
  IoRefreshOutline,
  IoSearchOutline
} from 'react-icons/io5'

function formatUnits8(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0'
  return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 8 })
}

function shortAddress(address: string): string {
  const raw = String(address || '').trim()
  if (!raw) return 'Address unavailable'
  if (raw.length <= 14) return raw
  return `${raw.slice(0, 8)}...${raw.slice(-6)}`
}

type SendRouteState = {
  assetId?: string
  sendEntryId?: string
  hubMode?: 'global'
  autoScan?: boolean
}
type GlobalScanMode = 'auto' | 'manual'
type GlobalScanOptions = {
  reason?: string
  mode?: GlobalScanMode
  refreshBalances?: boolean
  forceAssetRefresh?: boolean
}

type ScanHolder = {
  key: string
  networkId: string
  networkSymbol: string
  accountId: string
  accountLabel: string
  address: string
  itemId: string
  assetId?: string
  requestType: 'native' | 'asset'
  kind: SendableItem['kind']
  label: string
  symbol: string
  logoUrl?: string
  rawAmount: number
  amount: string
}

type AggregatedScanRow = {
  key: string
  networkId: string
  networkSymbol: string
  networkName: string
  networkLogo?: string
  itemId: string
  assetId?: string
  requestType: 'native' | 'asset'
  kind: SendableItem['kind']
  label: string
  symbol: string
  logoUrl?: string
  rawAmount: number
  amount: string
  holders: ScanHolder[]
}

type CachedScanPayload = {
  rows: AggregatedScanRow[]
  updatedAt: number
}

const SEND_HUB_SCAN_CACHE_KEY = 'metayoshi:send-hub:global-scan:v1'
const SEND_HUB_SCAN_AUTO_INTERVAL_MS = 90_000
const SEND_HUB_SCAN_STALE_MS = 30_000

function readCachedScanRows(): CachedScanPayload | null {
  try {
    const raw = localStorage.getItem(SEND_HUB_SCAN_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedScanPayload
    if (!Array.isArray(parsed?.rows)) return null
    const updatedAt = Number(parsed?.updatedAt || 0)
    return {
      rows: parsed.rows,
      updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0
    }
  } catch {
    return null
  }
}

function writeCachedScanRows(rows: AggregatedScanRow[]): void {
  try {
    const payload: CachedScanPayload = { rows, updatedAt: Date.now() }
    localStorage.setItem(SEND_HUB_SCAN_CACHE_KEY, JSON.stringify(payload))
  } catch {
    // ignore storage quota/runtime failures
  }
}

const Send: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    accounts,
    networks,
    activeNetworkId,
    getSendableItems,
    setActiveAccount,
    setActiveNetwork,
    fetchNetworkAssets
  } = useWalletStore()

  const activeNetwork = networks.find((n) => n.id === activeNetworkId) || networks[0]
  const networkById = useMemo(() => new Map(networks.map((network) => [network.id, network])), [networks])

  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isScanningAll, setIsScanningAll] = useState(false)
  const [scanProgress, setScanProgress] = useState<{ done: number; total: number; label: string }>({
    done: 0,
    total: 0,
    label: ''
  })
  const [scanError, setScanError] = useState('')
  const [scanRows, setScanRows] = useState<AggregatedScanRow[]>(() => {
    const cached = readCachedScanRows()
    return cached?.rows || []
  })
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const handledDeepLinkRef = useRef<string>('')
  const scanRunIdRef = useRef(0)
  const isScanningRef = useRef(false)

  const allItems = getSendableItems({ includeHidden: true })

  const filteredScanRows = useMemo(() => {
    const query = String(search || '').trim().toLowerCase()
    if (!query) return scanRows
    return scanRows.filter((row) => {
      const holderHaystack = row.holders
        .map((holder) => `${holder.accountLabel} ${holder.address}`.toLowerCase())
        .join(' ')
      const haystack = `${row.label} ${row.symbol} ${row.networkSymbol} ${row.networkName} ${row.assetId || ''} ${holderHaystack}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [scanRows, search])

  const selectedItem = useMemo(
    () => allItems.find((row) => row.id === selectedId) || null,
    [allItems, selectedId]
  )

  useEffect(() => {
    const routeState = (location.state as SendRouteState | null) || null
    const requestedAssetId = String(routeState?.assetId || '').trim()
    const requestedEntryId = String(routeState?.sendEntryId || '').trim()
    if (!requestedAssetId && !requestedEntryId) return
    if (allItems.length === 0) return

    const dedupeKey = `${requestedEntryId}|${requestedAssetId}`
    if (handledDeepLinkRef.current === dedupeKey) return
    handledDeepLinkRef.current = dedupeKey

    const match = allItems.find((item) => (
      (requestedEntryId && item.id === requestedEntryId)
      || (requestedAssetId && item.assetId === requestedAssetId)
    ))
    if (match) {
      setSelectedId(match.id)
    }

    navigate('/wallet/send', { replace: true, state: null })
  }, [location.state, allItems, navigate])

  const runGlobalScan = useCallback(async (options?: GlobalScanOptions) => {
    if (isScanningRef.current) return
    setScanError('')
    setIsScanningAll(true)
    isScanningRef.current = true
    const runId = scanRunIdRef.current + 1
    scanRunIdRef.current = runId
    const mode: GlobalScanMode = options?.mode === 'manual' ? 'manual' : 'auto'
    const includeBalanceRefresh = options?.refreshBalances ?? (mode === 'manual')
    const forceAssetRefresh = options?.forceAssetRefresh ?? (mode === 'manual')
    const reason = String(options?.reason || '').trim()
    setScanProgress({
      done: 0,
      total: 0,
      label: reason
        ? `Preparing ${mode === 'manual' ? 'full' : 'background'} scan (${reason})...`
        : `Preparing ${mode === 'manual' ? 'full' : 'background'} scan...`
    })

    const stateBefore = useWalletStore.getState()
    const originalActiveAccountId = stateBefore.activeAccountId
    const originalActiveNetworkId = stateBefore.activeNetworkId
    const originalAssetsSnapshot = {
      networkAssets: stateBefore.networkAssets,
      networkAssetLogos: stateBefore.networkAssetLogos,
      networkAssetLabels: stateBefore.networkAssetLabels,
      evmNftAssets: stateBefore.evmNftAssets
    }

    const shouldCancel = () => scanRunIdRef.current !== runId
    const scanAccounts = [...stateBefore.accounts]
    const scanNetworks = stateBefore.networks.filter((network) => {
      const networkCaps = resolveNetworkCapabilities(network)
      return networkCaps.features.nativeSend || networkCaps.features.assetLayer || networkCaps.features.assetSend
    })

    const total = Math.max(1, scanAccounts.length * scanNetworks.length)
    const aggregate = new Map<string, AggregatedScanRow>()
    let done = 0

    try {
      for (const account of scanAccounts) {
        if (shouldCancel()) throw new Error('[cancelled]')
        useWalletStore.setState((state) => ({
          activeAccountId: account.id
        }))

        for (const network of scanNetworks) {
          if (shouldCancel()) throw new Error('[cancelled]')
          done += 1
          setScanProgress({
            done,
            total,
            label: `Refreshing global balances (${done}/${total})...`
          })

          await setActiveNetwork(
            network.id,
            includeBalanceRefresh ? undefined : { skipRefresh: true }
          )

          useWalletStore.setState((state) => ({
            networkAssets: { ...state.networkAssets, [network.id]: {} },
            networkAssetLogos: { ...state.networkAssetLogos, [network.id]: {} },
            networkAssetLabels: { ...state.networkAssetLabels, [network.id]: {} },
            evmNftAssets: { ...state.evmNftAssets, [network.id]: {} }
          }))

          if (resolveNetworkCapabilities(network).features.assetLayer) {
            await fetchNetworkAssets({ force: forceAssetRefresh }).catch(() => {})
          }

          const scanState = useWalletStore.getState()
          const refreshedAccount = scanState.accounts.find((row) => row.id === account.id) || account
          const address = String(
            refreshedAccount.networkAddresses?.[network.id]
            || (network.coinType === 'EVM' ? refreshedAccount.addresses?.EVM : '')
            || ''
          ).trim()
          const itemRows = scanState.getSendableItems({
            accountId: account.id,
            networkId: network.id,
            includeHidden: true,
            includeZeroBalance: false
          })

          for (const item of itemRows) {
            const rawAmount = Math.max(0, Math.round(Number(item.rawAmount || 0)))
            if (rawAmount <= 0) continue
            const key = `${network.id}::${item.id}`
            const holderKey = `${account.id}::${network.id}::${item.id}`
            const holder: ScanHolder = {
              key: holderKey,
              networkId: network.id,
              networkSymbol: network.symbol,
              accountId: account.id,
              accountLabel: getAccountDisplayName(refreshedAccount, network.id, refreshedAccount.name),
              address,
              itemId: item.id,
              assetId: item.assetId,
              requestType: item.requestType,
              kind: item.kind,
              label: item.label,
              symbol: item.symbol,
              logoUrl: item.logoUrl,
              rawAmount,
              amount: formatUnits8(rawAmount / 1e8)
            }
            const existing = aggregate.get(key)
            if (!existing) {
              aggregate.set(key, {
                key,
                networkId: network.id,
                networkSymbol: network.symbol,
                networkName: network.name,
                networkLogo: network.logo,
                itemId: item.id,
                assetId: item.assetId,
                requestType: item.requestType,
                kind: item.kind,
                label: item.label,
                symbol: item.symbol,
                logoUrl: item.logoUrl,
                rawAmount,
                amount: formatUnits8(rawAmount / 1e8),
                holders: [holder]
              })
              continue
            }
            existing.rawAmount += rawAmount
            existing.amount = formatUnits8(existing.rawAmount / 1e8)
            const holderExists = existing.holders.some((row) => row.key === holder.key)
            if (!holderExists) existing.holders.push(holder)
          }

          await new Promise((resolve) => setTimeout(resolve, 0))
        }
      }

      if (shouldCancel()) throw new Error('[cancelled]')

      const rows = [...aggregate.values()]
        .map((row) => ({
          ...row,
          holders: [...row.holders].sort((a, b) => b.rawAmount - a.rawAmount)
        }))
        .sort((a, b) => {
          if (b.rawAmount !== a.rawAmount) return b.rawAmount - a.rawAmount
          if (a.networkName !== b.networkName) return a.networkName.localeCompare(b.networkName)
          return a.label.localeCompare(b.label)
        })

      setScanRows(rows)
      setExpandedRows({})
      writeCachedScanRows(rows)
      if (rows.length === 0) {
        setScanProgress({
          done: total,
          total,
          label: `${mode === 'manual' ? 'Full scan' : 'Auto-update'} complete. No balances found on scanned accounts.`
        })
      } else {
        setScanProgress({
          done: total,
          total,
          label: `${mode === 'manual' ? 'Full scan' : 'Auto-update'} complete. ${rows.length} aggregated holdings.`
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message !== '[cancelled]') {
        setScanError(`Global scan failed: ${message}`)
      }
    } finally {
      useWalletStore.setState({
        networkAssets: originalAssetsSnapshot.networkAssets,
        networkAssetLogos: originalAssetsSnapshot.networkAssetLogos,
        networkAssetLabels: originalAssetsSnapshot.networkAssetLabels,
        evmNftAssets: originalAssetsSnapshot.evmNftAssets
      })

      if (originalActiveAccountId) {
        useWalletStore.setState({ activeAccountId: originalActiveAccountId })
      }
      if (originalActiveNetworkId) {
        await useWalletStore.getState().setActiveNetwork(
          originalActiveNetworkId,
          includeBalanceRefresh ? undefined : { skipRefresh: true }
        ).catch(() => {})
        await useWalletStore.getState().fetchNetworkAssets({ force: forceAssetRefresh }).catch(() => {})
      }
      if (scanRunIdRef.current === runId) {
        isScanningRef.current = false
        setIsScanningAll(false)
      }
    }
  }, [fetchNetworkAssets, setActiveNetwork])

  useEffect(() => {
    const cached = readCachedScanRows()
    const cacheAgeMs = cached ? Math.max(0, Date.now() - cached.updatedAt) : Number.POSITIVE_INFINITY
    if (scanRows.length === 0 && cached?.rows?.length) {
      setScanRows(cached.rows)
    }
    if ((!cached || cacheAgeMs > SEND_HUB_SCAN_STALE_MS || scanRows.length === 0) && !isScanningRef.current) {
      void runGlobalScan({ mode: 'auto', reason: 'initial load', refreshBalances: true })
    }

    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return
      void runGlobalScan({ mode: 'auto', reason: 'scheduled refresh', refreshBalances: false })
    }

    const onVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return
      const latest = readCachedScanRows()
      const ageMs = latest ? Math.max(0, Date.now() - latest.updatedAt) : Number.POSITIVE_INFINITY
      if (!latest || ageMs > SEND_HUB_SCAN_STALE_MS) {
        void runGlobalScan({ mode: 'auto', reason: 'tab visible', refreshBalances: true })
      }
    }

    const intervalId = window.setInterval(tick, SEND_HUB_SCAN_AUTO_INTERVAL_MS)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility)
    }
    return () => {
      window.clearInterval(intervalId)
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility)
      }
    }
  }, [runGlobalScan, scanRows.length])

  useEffect(() => {
    const routeState = (location.state as SendRouteState | null) || null
    const requestedModeRaw = String(routeState?.hubMode || '').trim().toLowerCase()
    if (requestedModeRaw !== 'global') return

    if (routeState?.autoScan === true && scanRows.length === 0 && !isScanningAll) {
      void runGlobalScan({ mode: 'auto', reason: 'global network entry' })
    }

    navigate('/wallet/send', { replace: true, state: null })
  }, [location.state, navigate, scanRows.length, isScanningAll, runGlobalScan])

  const openSendFromScanHolder = async (holder: ScanHolder) => {
    setScanError('')

    try {
      setActiveAccount(holder.accountId)
      await setActiveNetwork(holder.networkId)
      const latestState = useWalletStore.getState()
      const candidates = latestState.getSendableItems({
        accountId: holder.accountId,
        networkId: holder.networkId,
        includeHidden: true,
        includeZeroBalance: false
      })
      const target = candidates.find((item) => (
        item.id === holder.itemId
        || (holder.assetId && item.assetId === holder.assetId)
      ))
      if (!target) {
        setScanError(`Cannot open send form for ${holder.label} on ${holder.networkSymbol}. Run scan again.`)
        return
      }
      setSelectedId(target.id)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setScanError(`Cannot prepare send form: ${message}`)
    }
  }

  if (selectedItem) {
    return (
      <SendTransferForm
        item={selectedItem}
        onBack={() => {
          setSelectedId(null)
        }}
      />
    )
  }

  return (
    <div className="flex flex-col h-full bg-dark-800">
      <header className="p-4 border-b border-dark-600 flex items-center gap-3">
        <button onClick={() => navigate('/wallet/assets')} className="text-gray-400 hover:text-white transition-colors">
          <IoArrowBackOutline className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-black uppercase tracking-widest text-gray-200">Send Hub</h1>
      </header>

      <div className="p-4 border-b border-dark-600/60 space-y-3">
        <div className="relative">
          <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <Input
            placeholder="Search token, account, address, blockchain..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9 bg-dark-700/50 border-dark-600 text-sm"
          />
        </div>

        {scanError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2">
            <p className="text-[11px] font-bold text-red-300">{scanError}</p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredScanRows.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center px-6 text-center text-sm text-gray-400 gap-3">
            <p>
              {isScanningAll
                ? 'Loading global holdings...'
                : (search.trim()
                  ? `No scan rows for "${search}".`
                  : 'Global list auto-updates in background across all addresses and blockchains.')}
            </p>
          </div>
        )}

        {filteredScanRows.map((row) => {
          const expanded = expandedRows[row.key] === true
          return (
            <div key={row.key} className="px-3 py-2 border-b border-dark-600/40">
              <button
                type="button"
                onClick={() => setExpandedRows((prev) => ({ ...prev, [row.key]: !expanded }))}
                className="w-full text-left flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-full border border-dark-600 bg-dark-700/60 overflow-hidden flex items-center justify-center shrink-0">
                  {row.logoUrl
                    ? <img src={row.logoUrl} alt={row.label} className="w-full h-full object-cover" />
                    : <IoLayersOutline className="w-4.5 h-4.5 text-gray-300" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-bold truncate">{row.label}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-dark-500 text-gray-300 font-bold uppercase">
                      {row.holders.length} {row.holders.length === 1 ? 'holder' : 'holders'}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 min-w-0">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                      {row.kind === 'native' ? row.networkSymbol : row.symbol}
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-blue-500/30 bg-blue-500/10 text-[9px] font-bold uppercase text-blue-200">
                      {row.networkLogo
                        ? <img src={row.networkLogo} alt={row.networkSymbol} className="w-3 h-3 rounded-full object-cover" />
                        : <span className="w-2 h-2 rounded-full bg-blue-300" />}
                      {row.networkSymbol}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold font-mono">{formatUnits8(row.rawAmount / 1e8)}</p>
                  <div className="flex justify-end">
                    {expanded ? (
                      <IoChevronDownOutline className="w-4 h-4 text-gray-500" />
                    ) : (
                      <IoChevronForwardOutline className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                </div>
              </button>

              {expanded && (
                <div className="mt-2 space-y-2 pl-12">
                  {row.holders.map((holder) => {
                    const holderNetwork = networkById.get(holder.networkId)
                    const holderCaps = resolveNetworkCapabilities(holderNetwork || activeNetwork)
                    const holderCanSend = holder.requestType === 'native'
                      ? holderCaps.features.nativeSend
                      : holderCaps.features.assetSend
                    return (
                      <div key={holder.key} className="p-2 rounded-xl border border-dark-600 bg-dark-700/40 flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold truncate">{holder.accountLabel}</p>
                          <p className="text-[10px] text-gray-500 font-mono truncate">{shortAddress(holder.address)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold font-mono">{holder.amount}</p>
                          <button
                            type="button"
                            onClick={() => void openSendFromScanHolder(holder)}
                            disabled={!holderCanSend || isScanningAll}
                            className="mt-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border border-primary/40 bg-primary/20 text-primary hover:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Send
