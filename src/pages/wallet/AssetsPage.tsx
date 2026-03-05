import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useWalletStore } from '../../store/walletStore'
import {
  IoArrowBackOutline,
  IoArrowUpOutline,
  IoLayersOutline,
  IoSearchOutline,
  IoClose,
  IoRefreshOutline,
  IoEyeOutline
} from 'react-icons/io5'
import { Input } from '../../components/Input'
import { resolveNetworkCapabilities } from '../../lib/networkCapabilities'
import { getTokenLogoForAsset } from '../../coins/tokenlogos'
import { isEvmNftAssetKey, parseSolanaAssetType, resolveSolanaAssetTypeLabel } from '../../lib/assetTypes'

// ── helpers ───────────────────────────────────────────────────────────────────

function formatAmount(raw: number): string {
  return (raw / 1e8).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 8 })
}

function parseAssetName(name: string): { root: string; sub: string | null } {
  const pipeIdx = name.indexOf('|')
  if (pipeIdx >= 0) return { root: name.slice(0, pipeIdx).trim(), sub: name.slice(pipeIdx + 1).trim() || null }
  const slashIdx = name.indexOf('/')
  if (slashIdx >= 0) return { root: name.slice(0, slashIdx).trim(), sub: name.slice(slashIdx + 1).trim() || null }
  return { root: name.trim(), sub: null }
}

function isRoot(name: string) { return !parseAssetName(name).sub }

// ── AssetRow ──────────────────────────────────────────────────────────────────

interface AssetRowProps {
  name: string
  displayName?: string
  nft?: boolean
  metaLabel?: string
  logoUrl?: string
  rawAmount: number
  onClick: () => void
  onPreview: () => void
  previewAvailable?: boolean
  hideMetaLabels?: boolean
}

const AssetRow: React.FC<AssetRowProps> = ({ name, displayName, nft = false, metaLabel, logoUrl, rawAmount, onClick, onPreview, previewAvailable = false, hideMetaLabels = false }) => {
  const effectiveName = displayName || name
  const { root, sub } = parseAssetName(effectiveName)
  const isRootAsset = !sub
  const logoSrc = String(logoUrl || '').trim() || getTokenLogoForAsset(effectiveName)

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
          {(nft || !hideMetaLabels) && (
            <span className={`text-[9px] font-bold uppercase ${isRootAsset ? 'text-yellow-600' : 'text-blue-500'}`}>
              {metaLabel || (nft ? 'EVM NFT' : (isRootAsset ? 'Root Asset' : `Sub of ${root}`))}
            </span>
          )}
          {!hideMetaLabels && previewAvailable && (
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
        title={
          previewAvailable
            ? (hideMetaLabels ? 'View asset file' : 'Preview asset file')
            : (hideMetaLabels ? 'No file available' : 'No preview available')
        }
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
    networks, activeNetworkId,
    serverCoinCatalog,
    networkAssets, networkAssetLogos, networkAssetLabels, evmNftAssets, fetchNetworkAssets, fetchAssetDetails,
    activity
  } = useWalletStore()

  const activeNetwork = networks.find(n => n.id === activeNetworkId) || networks[0]
  const caps = resolveNetworkCapabilities(activeNetwork)
  const activeModelId = String(activeNetwork.runtimeModelId || activeNetwork.id || '').trim().toLowerCase()
  const isEvmEcosystem = activeNetwork.coinType === 'EVM'
  const isSolanaEcosystem = activeNetwork.coinType === 'SOL' || activeModelId === 'sol'
  const supportsPreview =
    activeNetwork.coinType === 'UTXO'
    || activeNetwork.coinType === 'EVM'
    || activeModelId === 'sol'
    || activeModelId === 'ada'
    || activeModelId === 'tron'
    || activeNetwork.coinType === 'XRP'
  const canOpenAssetSend = caps.features.assetSend
  const nftLookup = evmNftAssets[activeNetworkId] ?? {}

  const [search,       setSearch]       = useState('')
  const [refreshing,   setRefreshing]   = useState(false)
  const [previewByAsset, setPreviewByAsset] = useState<Record<string, boolean>>({})
  const checkingRef = useRef<Set<string>>(new Set())
  const deepLinkHandledRef = useRef<string | null>(null)

  useEffect(() => {
    if (caps.features.assetLayer) void fetchNetworkAssets()
  }, [activeNetworkId, fetchNetworkAssets, caps.features.assetLayer])

  const assetUsage = useMemo(() => {
    const out = new Map<string, number>()
    for (const row of activity) {
      if (String(row?.networkId || '').trim() !== activeNetworkId) continue
      const name = String(row?.asset || '').trim().toLowerCase()
      if (!name) continue
      out.set(name, (out.get(name) || 0) + 1)
    }
    return out
  }, [activity, activeNetworkId])
  const byUsageThenName = (a: string, b: string): number => {
    const delta = (assetUsage.get(b.toLowerCase()) || 0) - (assetUsage.get(a.toLowerCase()) || 0)
    if (delta !== 0) return delta
    return a.localeCompare(b)
  }
  const rawAssets = networkAssets[activeNetworkId] ?? {}
  const assetLogos = networkAssetLogos[activeNetworkId] ?? {}
  const assetLabels = networkAssetLabels[activeNetworkId] ?? {}
  const allEntries = Object.entries(rawAssets)
  const roots      = allEntries.filter(([n]) => isRoot(n)).sort(([a], [b]) => byUsageThenName(a, b))
  const subs       = allEntries.filter(([n]) => !isRoot(n)).sort(([a], [b]) => byUsageThenName(a, b))
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
    if (!q) return sorted
    return sorted.filter(([n]) => {
      if (n.toLowerCase().includes(q)) return true
      const label = String(assetLabels[n] || '').trim().toLowerCase()
      return Boolean(label && label.includes(q))
    })
  }, [sorted, search, assetLabels])

  const visibleAssetNames = useMemo(() => {
    const rows = (isSearching ? filtered : sorted).slice(0, 40)
    return rows.map(([name]) => name)
  }, [filtered, isSearching, sorted])
  const resolveAssetDisplayName = (name: string): string => nftLookup[name]?.label || assetLabels[name] || name
  const isPreviewableAssetName = useCallback((name: string): boolean => {
    if (!supportsPreview) return false
    if (isSolanaEcosystem) return parseSolanaAssetType(name) !== 'spl-token'
    return true
  }, [isSolanaEcosystem, supportsPreview])
  const handleAssetRowClick = (name: string): void => {
    if (canOpenAssetSend) {
      navigate('/wallet/send', { state: { assetId: name } })
    }
  }

  const deepLinkedSendAsset = String((location.state as { sendAsset?: string } | null)?.sendAsset || '').trim()

  useEffect(() => {
    if (!canOpenAssetSend || !deepLinkedSendAsset) return
    if (deepLinkHandledRef.current === deepLinkedSendAsset) return
    if (!sorted.some(([name]) => name === deepLinkedSendAsset)) return
    navigate('/wallet/send', { state: { assetId: deepLinkedSendAsset } })
    deepLinkHandledRef.current = deepLinkedSendAsset
  }, [canOpenAssetSend, deepLinkedSendAsset, sorted, navigate])

  useEffect(() => {
    if (!supportsPreview) return
    let cancelled = false
    const checkPreviewability = async () => {
      for (const assetName of visibleAssetNames) {
        if (!isPreviewableAssetName(assetName)) {
          if (!cancelled) {
            setPreviewByAsset((prev) => (prev[assetName] === false ? prev : { ...prev, [assetName]: false }))
          }
          continue
        }
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
  }, [visibleAssetNames, fetchAssetDetails, isPreviewableAssetName, previewByAsset, supportsPreview])

  const handleRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    try { await fetchNetworkAssets({ force: true }) } finally { setRefreshing(false) }
  }

  return (
    <div className="bg-dark-800 w-full h-full flex flex-col overflow-hidden">

      {/* ── top bar ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-dark-600 shrink-0 bg-dark-900/60">
        <button
          onClick={() => navigate('/wallet/assets', { replace: true })}
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
        {catalogAssetRows.length > 0 && (
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
                displayName={resolveAssetDisplayName(name)}
                nft={isEvmNftAssetKey(name)}
                logoUrl={assetLogos[name]}
                rawAmount={raw}
                onClick={() => handleAssetRowClick(name)}
                onPreview={() => {
                  if (!isPreviewableAssetName(name)) return
                  navigate('/assets/preview', { state: { assetId: name } })
                }}
                previewAvailable={isPreviewableAssetName(name) && previewByAsset[name] === true}
                hideMetaLabels={isEvmEcosystem}
                metaLabel={isSolanaEcosystem ? resolveSolanaAssetTypeLabel(name) : undefined}
              />
            ))}
          </>
        )}

        {/* normal: EVM assets (flat, no root/sub labels) */}
        {caps.features.assetLayer && !isSearching && isEvmEcosystem && sorted.length > 0 && (
          <>
            {sorted.map(([name, raw]) => (
              <AssetRow
                key={name}
                name={name}
                displayName={resolveAssetDisplayName(name)}
                nft={isEvmNftAssetKey(name)}
                logoUrl={assetLogos[name]}
                rawAmount={raw}
                onClick={() => handleAssetRowClick(name)}
                onPreview={() => {
                  if (!isPreviewableAssetName(name)) return
                  navigate('/assets/preview', { state: { assetId: name } })
                }}
                previewAvailable={isPreviewableAssetName(name) && previewByAsset[name] === true}
                hideMetaLabels={true}
                metaLabel={isSolanaEcosystem ? resolveSolanaAssetTypeLabel(name) : undefined}
              />
            ))}
          </>
        )}

        {/* normal: Root Assets */}
        {caps.features.assetLayer && !isSearching && !isEvmEcosystem && roots.length > 0 && (
          <>
            <div className="px-4 pt-3 pb-1 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500 shrink-0" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-600">Root Assets ({roots.length})</p>
            </div>
            {roots.map(([name, raw]) => (
              <AssetRow
                key={name}
                name={name}
                displayName={resolveAssetDisplayName(name)}
                nft={isEvmNftAssetKey(name)}
                logoUrl={assetLogos[name]}
                rawAmount={raw}
                onClick={() => handleAssetRowClick(name)}
                onPreview={() => {
                  if (!isPreviewableAssetName(name)) return
                  navigate('/assets/preview', { state: { assetId: name } })
                }}
                previewAvailable={isPreviewableAssetName(name) && previewByAsset[name] === true}
                hideMetaLabels={false}
                metaLabel={isSolanaEcosystem ? resolveSolanaAssetTypeLabel(name) : undefined}
              />
            ))}
          </>
        )}

        {/* normal: Sub Assets */}
        {caps.features.assetLayer && !isSearching && !isEvmEcosystem && subs.length > 0 && (
          <>
            <div className="px-4 pt-3 pb-1 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500">Sub Assets ({subs.length})</p>
            </div>
            {subs.map(([name, raw]) => (
              <AssetRow
                key={name}
                name={name}
                displayName={resolveAssetDisplayName(name)}
                nft={isEvmNftAssetKey(name)}
                logoUrl={assetLogos[name]}
                rawAmount={raw}
                onClick={() => handleAssetRowClick(name)}
                onPreview={() => {
                  if (!isPreviewableAssetName(name)) return
                  navigate('/assets/preview', { state: { assetId: name } })
                }}
                previewAvailable={isPreviewableAssetName(name) && previewByAsset[name] === true}
                hideMetaLabels={false}
                metaLabel={isSolanaEcosystem ? resolveSolanaAssetTypeLabel(name) : undefined}
              />
            ))}
          </>
        )}

        <div className="h-4" />
      </div>

    </div>
  )
}

export default AssetsPage

