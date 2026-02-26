import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { useWalletStore } from '../../store/walletStore'
import {
  IoArrowBackOutline,
  IoArrowUpOutline,
  IoLayersOutline,
  IoSearchOutline,
  IoClose,
  IoInformationCircleOutline,
  IoCheckmarkCircle,
  IoRefreshOutline,
  IoEyeOutline
} from 'react-icons/io5'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { resolveNetworkCapabilities } from '../../lib/networkCapabilities'
import { getSendBlockedSyncReason, isSendBlockedBySync } from '../../lib/sendSyncPolicy'
import { getTokenLogoForAsset } from '../../coins/tokenlogos'

// ── helpers ───────────────────────────────────────────────────────────────────

function formatAmount(raw: number): string {
  return (raw / 1e8).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 8 })
}

function formatAmountInput(raw: number): string {
  const v = raw / 1e8
  return v.toFixed(8).replace(/\.?0+$/, '')
}

function formatCoinAmount(v: number): string {
  return v.toFixed(8).replace(/\.?0+$/, '')
}

function parseAssetName(name: string): { root: string; sub: string | null } {
  const pipeIdx = name.indexOf('|')
  if (pipeIdx >= 0) return { root: name.slice(0, pipeIdx).trim(), sub: name.slice(pipeIdx + 1).trim() || null }
  const slashIdx = name.indexOf('/')
  if (slashIdx >= 0) return { root: name.slice(0, slashIdx).trim(), sub: name.slice(slashIdx + 1).trim() || null }
  return { root: name.trim(), sub: null }
}

function isRoot(name: string) { return !parseAssetName(name).sub }
function isEvmNftAssetKey(name: string): boolean {
  return /^EVMNFT:(erc721|erc1155):0x[a-fA-F0-9]{40}:.+$/.test(String(name || '').trim())
}

// ── AssetRow ──────────────────────────────────────────────────────────────────

interface AssetRowProps {
  name: string
  displayName?: string
  nft?: boolean
  rawAmount: number
  onClick: () => void
  onPreview: () => void
  previewAvailable?: boolean
}

const AssetRow: React.FC<AssetRowProps> = ({ name, displayName, nft = false, rawAmount, onClick, onPreview, previewAvailable = false }) => {
  const effectiveName = displayName || name
  const { root, sub } = parseAssetName(effectiveName)
  const isRootAsset = !sub
  const logoSrc = getTokenLogoForAsset(effectiveName)

  return (
    <div className="w-full flex items-center gap-2 px-2 py-1.5 border-b border-dark-600/50 hover:bg-dark-700/40 transition-colors">
      <button
        onClick={onClick}
        className="flex-1 min-w-0 flex items-center gap-3 px-2 py-2 text-left group"
      >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
          isRootAsset ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-blue-500/10 border border-blue-500/30'
        }`}>
          {logoSrc ? (
            <img src={logoSrc} alt={`${name} logo`} className="w-full h-full rounded-full object-cover" />
          ) : (
            <IoLayersOutline className={`w-5 h-5 ${isRootAsset ? 'text-yellow-400' : 'text-blue-400'}`} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            {sub ? (
              <span className="text-sm font-bold text-blue-300">{sub}</span>
            ) : (
              <span className="text-sm font-bold truncate">{root}</span>
            )}
          </div>
          <span className={`text-[9px] font-bold uppercase ${isRootAsset ? 'text-yellow-600' : 'text-blue-500'}`}>
            {nft ? 'EVM NFT' : (isRootAsset ? 'Root Asset' : `Sub of ${root}`)}
          </span>
          {previewAvailable && (
            <span className="text-[9px] font-bold uppercase text-primary">Preview</span>
          )}
        </div>

        <div className="flex flex-col items-end shrink-0">
          <span className="text-sm font-bold font-mono">{formatAmount(rawAmount)}</span>
          <IoArrowUpOutline className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 transition-colors mt-0.5" />
        </div>
      </button>

      <button
        onClick={onPreview}
        disabled={!previewAvailable}
        className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
          previewAvailable
            ? 'border-primary/40 bg-primary/10 hover:bg-primary/20'
            : 'border-dark-600 bg-dark-700/40 opacity-40 cursor-not-allowed'
        }`}
        title={previewAvailable ? 'Preview asset file' : 'No preview available'}
      >
        <IoEyeOutline className={`w-4.5 h-4.5 ${previewAvailable ? 'text-primary' : 'text-gray-300'}`} />
      </button>
    </div>
  )
}

// ── AssetsPage ────────────────────────────────────────────────────────────────

const AssetsPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    accounts, activeAccountId,
    networks, activeNetworkId,
    serverCoinCatalog,
    networkAssets, evmNftAssets, fetchNetworkAssets, fetchAssetDetails, sendRtmAsset, addActivity,
    isConnected,
    isSyncing, syncPercent, lowSyncStreak
  } = useWalletStore()

  const activeAccount = accounts.find(a => a.id === activeAccountId) || accounts[0]
  const activeNetwork = networks.find(n => n.id === activeNetworkId) || networks[0]
  const caps = resolveNetworkCapabilities(activeNetwork)
  const activeModelId = String(activeNetwork.runtimeModelId || activeNetwork.id || '').trim().toLowerCase()
  const supportsPreview = activeNetwork.coinType === 'UTXO' || activeNetwork.coinType === 'EVM'
  const canSendAssets = caps.features.assetSend && activeNetwork.coinType === 'UTXO'
  const nftLookup = evmNftAssets[activeNetworkId] ?? {}
  const sendBlockedBySync = isSendBlockedBySync(isSyncing, syncPercent, isConnected, lowSyncStreak)
  const syncBlockedReason = getSendBlockedSyncReason(isSyncing, syncPercent, isConnected, lowSyncStreak)

  const [search,       setSearch]       = useState('')
  const [refreshing,   setRefreshing]   = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null)
  const [toAddress,    setToAddress]    = useState('')
  const [qty,          setQty]          = useState('')
  const [sendError,    setSendError]    = useState('')
  const [sending,      setSending]      = useState(false)
  const [txid,         setTxid]         = useState<string | null>(null)
  const [previewByAsset, setPreviewByAsset] = useState<Record<string, boolean>>({})
  const checkingRef = useRef<Set<string>>(new Set())
  const deepLinkHandledRef = useRef<string | null>(null)

  useEffect(() => {
    if (caps.features.assetLayer) void fetchNetworkAssets()
  }, [activeNetworkId, fetchNetworkAssets, caps.features.assetLayer])

  const rawAssets  = networkAssets[activeNetworkId] ?? {}
  const allEntries = Object.entries(rawAssets)
  const roots      = allEntries.filter(([n]) => isRoot(n)).sort(([a], [b]) => a.localeCompare(b))
  const subs       = allEntries.filter(([n]) => !isRoot(n)).sort(([a], [b]) => a.localeCompare(b))
  const sorted     = [...roots, ...subs]
  const catalogForModel = useMemo(
    () => serverCoinCatalog.filter((item) => String(item.runtimeModelId || '').trim().toLowerCase() === activeModelId),
    [serverCoinCatalog, activeModelId]
  )
  const catalogMainCount = catalogForModel.filter((item) => item.kind === 'main').length
  const catalogAssetRows = catalogForModel.filter((item) => item.kind === 'asset')

  const isSearching = search.trim().length > 0
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? sorted.filter(([n]) => n.toLowerCase().includes(q)) : sorted
  }, [sorted, search])

  const visibleAssetNames = useMemo(() => {
    const rows = (isSearching ? filtered : sorted).slice(0, 40)
    return rows.map(([name]) => name)
  }, [filtered, isSearching, sorted])

  const deepLinkedSendAsset = String((location.state as { sendAsset?: string } | null)?.sendAsset || '').trim()

  useEffect(() => {
    if (!canSendAssets || !deepLinkedSendAsset) return
    if (isEvmNftAssetKey(deepLinkedSendAsset)) return
    if (deepLinkHandledRef.current === deepLinkedSendAsset) return
    if (!sorted.some(([name]) => name === deepLinkedSendAsset)) return
    setSelectedAsset(deepLinkedSendAsset)
    setToAddress('')
    setQty('')
    setSendError('')
    setTxid(null)
    deepLinkHandledRef.current = deepLinkedSendAsset
  }, [canSendAssets, deepLinkedSendAsset, sorted])

  useEffect(() => {
    if (!supportsPreview) return
    let cancelled = false
    const checkPreviewability = async () => {
      for (const assetName of visibleAssetNames) {
        if (previewByAsset[assetName] !== undefined) continue
        if (checkingRef.current.has(assetName)) continue
        checkingRef.current.add(assetName)
        try {
          const details = await fetchAssetDetails(assetName)
          const hasPreview = Boolean(String(details?.preview_url || details?.ipfs_hash || details?.metadata_url || '').trim())
          if (!cancelled) {
            setPreviewByAsset((prev) => ({ ...prev, [assetName]: hasPreview }))
          }
        } catch {
          if (!cancelled) {
            setPreviewByAsset((prev) => ({ ...prev, [assetName]: false }))
          }
        } finally {
          checkingRef.current.delete(assetName)
        }
      }
    }
    if (visibleAssetNames.length > 0) void checkPreviewability()
    return () => { cancelled = true }
  }, [visibleAssetNames, fetchAssetDetails, previewByAsset, supportsPreview])

  const estimatedFeeCoin = useMemo(() => {
    const rawFeePerByteCoins = Number(activeNetwork?.feePerByte ?? 0.0000002)
    let feePerByteSats = Math.max(1, Math.round(rawFeePerByteCoins * 1e8))
    if (feePerByteSats > 500) feePerByteSats = Math.max(1, Math.round(feePerByteSats / 1000))

    // Mirrors non-custodial asset-send sizing: 2 inputs (asset + fee) and 3 outputs with change.
    const estimatedBytes = 10 + (148 * 2) + (34 * 3)
    const estimatedFeeSats = estimatedBytes * feePerByteSats
    return estimatedFeeSats / 1e8
  }, [activeNetwork?.feePerByte])

  const handleRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    try { await fetchNetworkAssets() } finally { setRefreshing(false) }
  }

  const openSend = (name: string) => {
    setSelectedAsset(name); setToAddress(''); setQty('')
    setSendError(''); setTxid(null)
  }
  const closeSheet = () => {
    setSelectedAsset(null); setToAddress(''); setQty('')
    setSendError(''); setTxid(null)
  }
  const handleMax = () => {
    if (!selectedAsset) return
    const r = rawAssets[selectedAsset]
    if (r != null) setQty(formatAmountInput(r))
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setSendError('')
    if (!selectedAsset) return
    if (sendBlockedBySync) { setSendError(syncBlockedReason); return }
    if (!toAddress.trim()) { setSendError('Recipient address is required'); return }
    if (!qty || parseFloat(qty) <= 0) { setSendError('Quantity must be greater than 0'); return }
    const avail = (rawAssets[selectedAsset] ?? 0) / 1e8
    if (parseFloat(qty) > avail) { setSendError('Insufficient asset balance'); return }

    setSending(true)
    try {
      const result = await sendRtmAsset({ assetId: selectedAsset, qty, toAddress: toAddress.trim() })
      const fromAddress = activeAccount?.networkAddresses?.[activeNetworkId]
        || (activeNetwork.coinType === 'EVM' ? activeAccount?.addresses?.EVM : '') || ''
      addActivity({
        id: result.txid, type: 'sent', asset: selectedAsset, amount: qty,
        from: fromAddress, to: toAddress.trim(),
        status: 'confirmed', timestamp: Date.now(), networkId: activeNetworkId
      })
      setTxid(result.txid)
      void fetchNetworkAssets()
    } catch (err) {
      setSendError(err instanceof Error ? err.message : String(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-dark-800 w-full h-full flex flex-col overflow-hidden">

      {/* ── top bar ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-dark-600 shrink-0 bg-dark-900/60">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-dark-700 transition-colors shrink-0"
        >
          <IoArrowBackOutline className="w-5 h-5 text-gray-300" />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-black uppercase tracking-widest">My Assets</h1>
          <p className="text-[10px] text-gray-500">{activeNetwork.name} · {sorted.length} asset{sorted.length !== 1 ? 's' : ''}</p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-dark-700 transition-colors shrink-0"
          title="Refresh"
        >
          <IoRefreshOutline className={`w-5 h-5 text-gray-400 ${refreshing ? 'animate-spin-smooth' : ''}`} />
        </button>
      </div>

      {/* ── search bar ── */}
      {caps.features.assetLayer && (
        <div className="px-4 py-2.5 border-b border-dark-600/60 shrink-0">
          <div className="relative">
            <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            <Input
              placeholder="Search assets…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-8 bg-dark-700/40 border-dark-600 text-sm placeholder-gray-600 h-9"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-dark-600 transition-colors"
              >
                <IoClose className="w-3.5 h-3.5 text-gray-500 hover:text-white" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── scrollable content ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {catalogForModel.length > 0 && (
          <div className="px-4 pt-3 pb-2 border-b border-dark-600/40">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Server Catalog · Main {catalogMainCount} · Assets {catalogAssetRows.length}
            </p>
            {catalogAssetRows.length > 0 && (
              <p className="text-[10px] text-gray-500 mt-1">
                Token/asset entries from server configuration are catalogued here while blockchains stay in coin selector.
              </p>
            )}
          </div>
        )}

        {catalogAssetRows.length > 0 && (
          <>
            <div className="px-4 pt-3 pb-1 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500">
                Catalogued Token/Assets ({catalogAssetRows.length})
              </p>
            </div>
            {catalogAssetRows.slice(0, 50).map((item) => (
              <div key={`catalog-${item.coinId}`} className="px-4 py-2 border-b border-dark-600/30 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-200 truncate">{item.name}</p>
                  <p className="text-[10px] text-gray-500 font-mono truncate">{item.coinId}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-blue-500/40 text-blue-300 uppercase font-bold">
                  {item.symbol || 'ASSET'}
                </span>
              </div>
            ))}
            {catalogAssetRows.length > 50 && (
              <p className="px-4 py-2 text-[10px] text-gray-500">
                Showing first 50 catalogued assets for this chain model.
              </p>
            )}
          </>
        )}

        {/* not supported */}
        {!caps.features.assetLayer && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6 opacity-60">
            <IoLayersOutline className="w-8 h-8 text-gray-500" />
            <p className="text-sm font-bold text-gray-400">Assets not supported</p>
            <p className="text-xs text-gray-600">{activeNetwork.name} does not support token assets.</p>
          </div>
        )}

        {/* empty */}
        {caps.features.assetLayer && sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6 opacity-60">
            <IoLayersOutline className="w-8 h-8 text-gray-500" />
            <div>
              <p className="text-sm font-bold text-gray-400">No assets on this address</p>
              <p className="text-xs text-gray-600 mt-1">Assets you hold on {activeNetwork.name} will appear here.</p>
            </div>
          </div>
        )}

        {/* search: no results */}
        {caps.features.assetLayer && sorted.length > 0 && isSearching && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-center px-6">
            <IoSearchOutline className="w-7 h-7 text-gray-600" />
            <p className="text-sm font-bold text-gray-400">No results for "{search}"</p>
            <button onClick={() => setSearch('')} className="text-xs text-primary hover:underline">Clear search</button>
          </div>
        )}

        {/* search results (flat) */}
        {caps.features.assetLayer && isSearching && filtered.length > 0 && (
          <>
            <div className="px-4 pt-3 pb-1 flex items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </p>
            </div>
            {filtered.map(([name, raw]) => (
              <AssetRow
                key={name}
                name={name}
                displayName={nftLookup[name]?.label}
                nft={isEvmNftAssetKey(name)}
                rawAmount={raw}
                onClick={() => { if (canSendAssets && !isEvmNftAssetKey(name)) openSend(name) }}
                onPreview={() => {
                  if (!supportsPreview) return
                  navigate('/assets/preview', { state: { assetId: name } })
                }}
                previewAvailable={supportsPreview && previewByAsset[name] === true}
              />
            ))}
          </>
        )}

        {/* normal: Root Assets */}
        {caps.features.assetLayer && !isSearching && roots.length > 0 && (
          <>
            <div className="px-4 pt-3 pb-1 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500 shrink-0" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-600">Root Assets ({roots.length})</p>
            </div>
            {roots.map(([name, raw]) => (
              <AssetRow
                key={name}
                name={name}
                displayName={nftLookup[name]?.label}
                nft={isEvmNftAssetKey(name)}
                rawAmount={raw}
                onClick={() => { if (canSendAssets && !isEvmNftAssetKey(name)) openSend(name) }}
                onPreview={() => {
                  if (!supportsPreview) return
                  navigate('/assets/preview', { state: { assetId: name } })
                }}
                previewAvailable={supportsPreview && previewByAsset[name] === true}
              />
            ))}
          </>
        )}

        {/* normal: Sub Assets */}
        {caps.features.assetLayer && !isSearching && subs.length > 0 && (
          <>
            <div className="px-4 pt-3 pb-1 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500">Sub Assets ({subs.length})</p>
            </div>
            {subs.map(([name, raw]) => (
              <AssetRow
                key={name}
                name={name}
                displayName={nftLookup[name]?.label}
                nft={isEvmNftAssetKey(name)}
                rawAmount={raw}
                onClick={() => { if (canSendAssets && !isEvmNftAssetKey(name)) openSend(name) }}
                onPreview={() => {
                  if (!supportsPreview) return
                  navigate('/assets/preview', { state: { assetId: name } })
                }}
                previewAvailable={supportsPreview && previewByAsset[name] === true}
              />
            ))}
          </>
        )}

        <div className="h-4" />
      </div>

      {/* ── Send Asset bottom sheet (portal) ──────────────────────────────── */}
      {selectedAsset !== null && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-end"
          onClick={closeSheet}
        >
          <div
            className="w-full max-w-[380px] bg-dark-800 rounded-t-3xl border-t border-dark-600 animate-in slide-in-from-bottom duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-dark-600" />
            </div>

            {/* header */}
            <div className="flex items-start justify-between px-6 pt-3 pb-4 border-b border-dark-600">
              <div className="flex flex-col gap-1.5">
                <h2 className="text-sm font-black uppercase tracking-widest">Send Asset</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                    isRoot(selectedAsset)
                      ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                      : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  }`}>
                    {isRoot(selectedAsset) ? 'Root' : 'Sub'}
                  </span>
                  <span className="text-sm font-mono font-bold text-white">{selectedAsset}</span>
                </div>
              </div>
              <button onClick={closeSheet} className="p-1.5 rounded-lg hover:bg-dark-700 transition-colors mt-0.5">
                <IoClose className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>
            </div>

            {txid ? (
              /* success */
              <div className="p-6 flex flex-col items-center gap-5 text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500 flex items-center justify-center">
                  <IoCheckmarkCircle className="w-9 h-9 text-green-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-bold text-green-400">Asset Sent!</p>
                  <p className="text-xs text-gray-500">Transaction submitted to the network</p>
                  <p className="text-[10px] text-gray-600 font-mono mt-2 break-all leading-relaxed px-2">{txid}</p>
                </div>
                <Button className="w-full" onClick={closeSheet}>Done</Button>
              </div>
            ) : (
              /* form */
              <form onSubmit={handleSend} className="p-5 space-y-4">

                {/* available */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-dark-600 bg-dark-700/30">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                      isRoot(selectedAsset) ? 'bg-yellow-500/10' : 'bg-blue-500/10'
                    }`}>
                      <IoLayersOutline className={`w-4 h-4 ${isRoot(selectedAsset) ? 'text-yellow-400' : 'text-blue-400'}`} />
                    </div>
                    <span className="text-xs text-gray-400">Available</span>
                  </div>
                  <span className="text-sm font-bold font-mono">
                    {rawAssets[selectedAsset] != null ? formatAmount(rawAssets[selectedAsset]) : '—'}
                  </span>
                </div>

                {/* recipient */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Recipient Address</label>
                  <Input
                    placeholder={`Enter ${activeNetwork.name} address`}
                    value={toAddress}
                    onChange={e => setToAddress(e.target.value)}
                    className="bg-dark-700/50 border-dark-600 font-mono text-xs"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>

                {/* quantity */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quantity</label>
                    <button
                      type="button"
                      onClick={handleMax}
                      className="text-[10px] font-bold text-primary hover:opacity-80 uppercase px-2 py-0.5 rounded bg-primary/10 transition-opacity"
                    >
                      MAX
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.00000001"
                      min="0"
                      placeholder="0.00"
                      value={qty}
                      onChange={e => setQty(e.target.value)}
                      className="bg-dark-700/50 border-dark-600 pr-20"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500 uppercase truncate max-w-[72px]">
                      {parseAssetName(selectedAsset).sub || parseAssetName(selectedAsset).root}
                    </span>
                  </div>
                </div>

                {/* fee note */}
                <div className="flex gap-2.5 p-3 bg-dark-700/20 rounded-xl border border-dark-600/60">
                  <IoInformationCircleOutline className="w-4 h-4 text-gray-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-gray-600 leading-relaxed">
                    Estimated required fee: ~{formatCoinAmount(estimatedFeeCoin)} {activeNetwork.symbol}. Change is returned automatically.
                  </p>
                </div>

                {/* error */}
                {sendError && (
                  <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-xl">
                    <p className="text-xs font-bold text-red-300 text-center">{sendError}</p>
                  </div>
                )}
                {!sendError && sendBlockedBySync && (
                  <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-xl">
                    <p className="text-xs font-bold text-yellow-200 text-center">{syncBlockedReason}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full btn-primary flex items-center justify-center gap-2"
                  isLoading={sending}
                  disabled={sendBlockedBySync || !toAddress.trim() || !qty || parseFloat(qty) <= 0 || sending}
                >
                  <IoArrowUpOutline className="w-4 h-4" />
                  Send {parseAssetName(selectedAsset).sub || parseAssetName(selectedAsset).root}
                </Button>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default AssetsPage

