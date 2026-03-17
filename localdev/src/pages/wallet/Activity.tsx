import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { ActivityRow } from '../../components/ListItems'
import { useWalletStore } from '../../store/walletStore'
import { IoClose, IoCopyOutline, IoOpenOutline, IoCheckmark, IoSearchOutline } from 'react-icons/io5'
import { normalizeActivityAssetId, resolveActivityAssetFilterKey } from '../../lib/activityIdentity'
import { resolveNetworkCapabilities } from '../../lib/networkCapabilities'
import { buildActivitySelectionKey, buildTxExplorerUrl, normalizeActivityNetworkId } from '../../lib/txExplorer'

const Activity: React.FC = () => {
  const location = useLocation()
  const {
    activity,
    activeNetworkId,
    networks,
    accounts,
    activeAccountId,
    trackActivityTransactionStatus
  } = useWalletStore()
  const [selectedTxKey, setSelectedTxKey] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [assetFilter, setAssetFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'sent' | 'received' | 'swap'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'rejected'>('all')
  const [periodFilter, setPeriodFilter] = useState<'all' | '24h' | '7d' | '30d'>('all')
  const requestedAssetFilter = normalizeActivityAssetId(
    String(((location.state as { assetId?: string } | null)?.assetId) || '').trim(),
    activeNetworkId
  )

  const activeNetwork = networks.find((n) => n.id === activeNetworkId) || networks[0] || null
  const activeAccount = accounts.find((a) => a.id === activeAccountId) || accounts[0]
  const activeCaps = resolveNetworkCapabilities(activeNetwork || {})

  if (!activeNetwork) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-center opacity-60">
        <p className="text-sm font-medium text-gray-300">No active network available</p>
      </div>
    )
  }

  const activeNetworkAccountAddressSet = useMemo(() => {
    const set = new Set<string>()
    if (!activeAccount || !activeNetwork) return set

    const push = (value: unknown) => {
      const raw = String(value || '').trim()
      if (!raw) return
      set.add(raw)
      set.add(raw.toLowerCase())
    }

    const activeNetworkCanonicalId = normalizeActivityNetworkId(activeNetworkId)
    const networkAddresses = activeAccount.networkAddresses || {}
    for (const [networkId, address] of Object.entries(networkAddresses)) {
      if (normalizeActivityNetworkId(networkId) !== activeNetworkCanonicalId) continue
      push(address)
    }

    // Keep a narrow fallback for legacy records that may not have networkAddresses mapped yet.
    if (activeNetwork.coinType === 'EVM') push(activeAccount.addresses?.EVM)
    if (activeNetwork.coinType === 'UTXO') {
      push(activeAccount.addresses?.UTXO)
      push(activeAccount.addresses?.BTC)
    }
    if (activeNetwork.coinType === 'COSMOS') push(activeAccount.addresses?.COSMOS)
    if (activeNetwork.coinType === 'SOL') push(activeAccount.addresses?.SOL)
    return set
  }, [activeAccount, activeNetwork, activeNetworkId])

  const baseActivity = useMemo(() => (
    activity
      .filter((a) => {
        if (normalizeActivityNetworkId(a.networkId) !== normalizeActivityNetworkId(activeNetworkId)) return false
        if (a.accountId) return a.accountId === activeAccount?.id

        // Legacy fallback for entries saved before accountId tagging.
        const from = String(a.from || '').trim()
        const to = String(a.to || '').trim()
        if (!from && !to) return false
        return (
          activeNetworkAccountAddressSet.has(from)
          || activeNetworkAccountAddressSet.has(from.toLowerCase())
          || activeNetworkAccountAddressSet.has(to)
          || activeNetworkAccountAddressSet.has(to.toLowerCase())
        )
      })
      .sort((a, b) => b.timestamp - a.timestamp)
  ), [activity, activeAccount?.id, activeNetworkAccountAddressSet, activeNetworkId])

  const assetOptions = useMemo(() => {
    const byId = new Map<string, { id: string; label: string; count: number }>()
    for (const tx of baseActivity) {
      const id = resolveActivityAssetFilterKey(tx, activeNetwork.symbol)
      if (!id) continue
      const existing = byId.get(id)
      if (existing) {
        existing.count += 1
        continue
      }
      byId.set(id, {
        id,
        label: String(tx.asset || id).trim() || id,
        count: 1
      })
    }
    return [...byId.values()].sort((left, right) => left.label.localeCompare(right.label))
  }, [baseActivity, activeNetwork.symbol])

  useEffect(() => {
    if (!requestedAssetFilter) return
    setAssetFilter(requestedAssetFilter)
  }, [requestedAssetFilter])

  useEffect(() => {
    if (assetFilter === 'all') return
    if (assetOptions.some((option) => option.id === assetFilter)) return
    setAssetFilter('all')
  }, [assetFilter, assetOptions])

  useEffect(() => {
    for (const tx of baseActivity) {
      if (tx.status !== 'pending') continue
      trackActivityTransactionStatus({ txid: tx.id, networkId: tx.networkId })
    }
  }, [baseActivity, trackActivityTransactionStatus])

  const getSelectionKey = (tx: typeof baseActivity[number]) => (
    `${buildActivitySelectionKey(tx.id, tx.networkId)}::${String(tx.accountId || '').trim().toLowerCase()}::${resolveActivityAssetFilterKey(tx, activeNetwork.symbol)}`
  )

  const selectedTx = useMemo(() => {
    if (!selectedTxKey) return null
    return baseActivity.find((tx) => getSelectionKey(tx) === selectedTxKey) || null
  }, [baseActivity, selectedTxKey, activeNetwork.symbol])

  useEffect(() => {
    if (!selectedTxKey) return
    if (selectedTx) return
    setSelectedTxKey(null)
  }, [selectedTx, selectedTxKey])

  const filteredActivity = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const now = Date.now()
    const periodMs = periodFilter === '24h'
      ? 24 * 60 * 60 * 1000
      : periodFilter === '7d'
        ? 7 * 24 * 60 * 60 * 1000
        : periodFilter === '30d'
          ? 30 * 24 * 60 * 60 * 1000
          : 0

    return baseActivity.filter((tx) => {
      if (assetFilter !== 'all') {
        const txAssetFilterKey = resolveActivityAssetFilterKey(tx, activeNetwork.symbol)
        if (txAssetFilterKey !== assetFilter) return false
      }
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false
      if (statusFilter !== 'all' && tx.status !== statusFilter) return false
      if (periodMs > 0 && now - tx.timestamp > periodMs) return false
      if (!normalizedQuery) return true

      const haystack = [
        tx.id,
        tx.type,
        tx.status,
        tx.asset,
        tx.assetId || '',
        tx.amount,
        tx.from || '',
        tx.to || '',
        new Date(tx.timestamp).toLocaleString()
      ].join(' ').toLowerCase()

      return haystack.includes(normalizedQuery)
    })
  }, [activeNetwork.symbol, assetFilter, baseActivity, periodFilter, query, statusFilter, typeFilter])

  const fallbackFromAddress = activeAccount?.networkAddresses?.[activeNetworkId]
    || (activeNetwork.coinType === 'EVM' ? activeAccount?.addresses?.EVM : '')
    || ''

  const copyValue = async (key: string, value: string) => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(key)
      setTimeout(() => setCopiedField(null), 1500)
    } catch {
      // ignore clipboard errors
    }
  }

  const selectedNetwork = useMemo(() => (
    selectedTx
      ? (
        networks.find((n) => (
          normalizeActivityNetworkId(n.id) === normalizeActivityNetworkId(selectedTx.networkId)
        )) || activeNetwork
      )
      : activeNetwork
  ), [activeNetwork, networks, selectedTx])

  const txExplorerUrl = (() => {
    if (!selectedTx?.id) return ''
    return buildTxExplorerUrl(
      String(selectedNetwork?.explorerUrl || ''),
      String(selectedTx.networkId || ''),
      String(selectedTx.id || '')
    )
  })()

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2.5 border-b border-dark-600/70 bg-dark-900/50 space-y-2">
        <div className="relative">
          <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search txid, asset, amount, address, status..."
            className="w-full bg-dark-700/60 border border-dark-600 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-dark-600 transition-colors"
              title="Clear search"
            >
              <IoClose className="w-3.5 h-3.5 text-gray-500 hover:text-white" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-0.5">
          <select
            value={assetFilter}
            onChange={(e) => setAssetFilter(e.target.value)}
            className="min-w-[120px] bg-dark-700/60 border border-dark-600 rounded-xl px-3 py-2 text-[11px] font-medium text-gray-200 focus:outline-none focus:border-primary transition-colors"
            aria-label="Filter activity by asset"
          >
            <option value="all">Asset: All</option>
            {assetOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} ({option.count})
              </option>
            ))}
          </select>
          {(['all', 'sent', 'received', 'swap'] as const).map((value) => (
            <FilterChip
              key={`type-${value}`}
              label={value === 'all' ? 'Type: All' : `Type: ${value}`}
              active={typeFilter === value}
              onClick={() => setTypeFilter(value)}
            />
          ))}
          {(['all', 'confirmed', 'pending', 'rejected'] as const).map((value) => (
            <FilterChip
              key={`status-${value}`}
              label={value === 'all' ? 'Status: All' : `Status: ${value}`}
              active={statusFilter === value}
              onClick={() => setStatusFilter(value)}
            />
          ))}
          {(['all', '24h', '7d', '30d'] as const).map((value) => (
            <FilterChip
              key={`period-${value}`}
              label={value === 'all' ? 'Period: All' : value}
              active={periodFilter === value}
              onClick={() => setPeriodFilter(value)}
            />
          ))}
        </div>

        <div className="text-[10px] text-gray-500 px-0.5">
          Showing {filteredActivity.length} of {baseActivity.length} transaction{baseActivity.length === 1 ? '' : 's'}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredActivity.length > 0 ? (
          filteredActivity.map((item) => (
            <ActivityRow
              key={item.id}
              type={item.type}
              amount={item.amount}
              asset={item.asset}
              isAssetTransfer={
                activeCaps.features.assetLayer
                && String(item.asset || '').trim().toUpperCase() !== String(activeNetwork.symbol || '').trim().toUpperCase()
              }
              address={item.to || item.from}
              status={item.status}
              timestamp={item.timestamp}
              onClick={() => setSelectedTxKey(getSelectionKey(item))}
            />
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-12 text-center opacity-50">
            <p className="text-sm font-medium">
              {baseActivity.length > 0 ? 'No transactions match your filters' : 'You have no transactions'}
            </p>
          </div>
        )}
      </div>

      {selectedTx && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-end"
          onClick={() => setSelectedTxKey(null)}
        >
          <div
            className="w-full max-w-[380px] max-h-[92vh] bg-dark-800 rounded-t-3xl border-t border-dark-600 animate-in slide-in-from-bottom duration-200 flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 pt-5 pb-3 border-b border-dark-600 bg-dark-800">
              <div className="flex flex-col">
                <h2 className="text-sm font-black uppercase tracking-widest">Transaction Details</h2>
                <span className="text-[10px] text-gray-500">
                  {new Date(selectedTx.timestamp).toLocaleString()}
                </span>
              </div>
              <button onClick={() => setSelectedTxKey(null)}>
                <IoClose className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-sm overflow-y-auto custom-scrollbar">
              <DetailRow label="Status" value={selectedTx.status} />
              <DetailRow label="Type" value={selectedTx.type} />
              <DetailRow label="Network" value={`${selectedNetwork.name} (${selectedNetwork.symbol})`} />
              <DetailRow label="Asset" value={selectedTx.asset} />
              {selectedTx.assetId ? <DetailRow label="Asset ID" value={selectedTx.assetId} isMono /> : null}
              <DetailRow label="Amount" value={selectedTx.amount} />
              <DetailRow label="From" value={selectedTx.from || fallbackFromAddress || '-'} isMono />
              <DetailRow label="To" value={selectedTx.to || '-'} isMono />

              <div className="rounded-xl border border-dark-600 bg-dark-700/30 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Transaction ID</span>
                  <button
                    onClick={() => void copyValue('txid', selectedTx.id)}
                    className="p-1.5 rounded-lg hover:bg-dark-600 transition-colors"
                    title="Copy transaction id"
                  >
                    {copiedField === 'txid'
                      ? <IoCheckmark className="w-4 h-4 text-green-400" />
                      : <IoCopyOutline className="w-4 h-4 text-gray-400 hover:text-white" />
                    }
                  </button>
                </div>
                <p className="text-[11px] font-mono break-all text-gray-300">{selectedTx.id}</p>
              </div>

              {txExplorerUrl && (
                <a
                  href={txExplorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-dark-600 bg-dark-700/30 py-2.5 hover:bg-dark-700 transition-colors"
                >
                  <span className="text-xs font-bold uppercase tracking-widest">Open Explorer</span>
                  <IoOpenOutline className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

interface FilterChipProps {
  label: string
  active: boolean
  onClick: () => void
}

const FilterChip: React.FC<FilterChipProps> = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap border transition-colors ${
      active
        ? 'bg-primary/20 text-primary border-primary/40'
        : 'bg-dark-700/50 text-gray-400 border-dark-600 hover:text-gray-200 hover:bg-dark-700'
    }`}
  >
    {label}
  </button>
)

interface DetailRowProps {
  label: string
  value: string
  isMono?: boolean
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, isMono = false }) => (
  <div className="flex items-start justify-between gap-3 rounded-xl border border-dark-600 bg-dark-700/20 px-3 py-2.5">
    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</span>
    <span className={`text-right ${isMono ? 'font-mono text-[11px] break-all' : 'font-bold text-xs capitalize'}`}>
      {value}
    </span>
  </div>
)

export default Activity


