import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWalletStore } from '../../store/walletStore'
import { IoLayersOutline, IoChevronForward, IoEyeOutline } from 'react-icons/io5'
import { resolveNetworkCapabilities } from '../../lib/networkCapabilities'
import { getTokenLogoForAsset } from '../../coins/tokenlogos'

// ── helpers ──────────────────────────────────────────────────────────────────

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
function isEvmNftAssetKey(name: string): boolean {
  return /^EVMNFT:(erc721|erc1155):0x[a-fA-F0-9]{40}:.+$/.test(String(name || '').trim())
}

// ── compact asset row (mirrors ActivityRow look) ───────────────────────────

interface AssetPreviewRowProps {
  name: string
  displayName?: string
  nft?: boolean
  rawAmount: number
  onClick: () => void
  onPreview: () => void
  previewAvailable?: boolean
}

const AssetPreviewRow: React.FC<AssetPreviewRowProps> = ({ name, displayName, nft = false, rawAmount, onClick, onPreview, previewAvailable = false }) => {
  const effectiveName = displayName || name
  const { root, sub } = parseAssetName(effectiveName)
  const isRootAsset = !sub
  const logoSrc = getTokenLogoForAsset(effectiveName)

  return (
    <div className="w-full flex items-center gap-2 px-2 py-1.5 border-b border-dark-600/50 hover:bg-dark-700 transition-colors">
      <button
        onClick={onClick}
        className="flex-1 min-w-0 flex items-center justify-between p-2 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* icon */}
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
            isRootAsset ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-blue-500/10 border border-blue-500/30'
          }`}>
            {logoSrc ? (
              <img src={logoSrc} alt={`${name} logo`} className="w-full h-full rounded-full object-cover" />
            ) : (
              <IoLayersOutline className={`w-4.5 h-4.5 ${isRootAsset ? 'text-yellow-400' : 'text-blue-400'}`} />
            )}
          </div>

          {/* name + badge */}
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              {sub ? (
                <span className="text-sm font-bold text-blue-300 leading-none truncate">{sub}</span>
              ) : (
                <span className="text-sm font-bold leading-none truncate">{root}</span>
              )}
            </div>
            <span className={`text-[9px] font-bold uppercase ${isRootAsset ? 'text-yellow-600' : 'text-blue-500'}`}>
              {nft ? 'EVM NFT' : (isRootAsset ? 'Root Asset' : `Sub · ${root}`)}
            </span>
            {previewAvailable && (
              <span className="text-[9px] font-bold uppercase text-primary">Preview</span>
            )}
          </div>
        </div>

        {/* amount + arrow */}
        <div className="flex items-center gap-2 shrink-0 pl-2">
          <span className="text-sm font-bold font-mono">{formatAmount(rawAmount)}</span>
          <IoChevronForward className="text-gray-500 w-4 h-4" />
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

// ── main ─────────────────────────────────────────────────────────────────────

const Assets: React.FC = () => {
  const { networks, activeNetworkId, networkAssets, evmNftAssets, fetchNetworkAssets, fetchAssetDetails } = useWalletStore()
  const navigate = useNavigate()
  const [previewByAsset, setPreviewByAsset] = useState<Record<string, boolean>>({})
  const checkingRef = useRef<Set<string>>(new Set())

  const activeNetwork = networks.find(n => n.id === activeNetworkId) || networks[0]
  const caps = resolveNetworkCapabilities(activeNetwork)
  const supportsPreview = activeNetwork.coinType === 'UTXO' || activeNetwork.coinType === 'EVM'
  const canSendAssets = caps.features.assetSend && activeNetwork.coinType === 'UTXO'
  const nftLookup = evmNftAssets[activeNetworkId] ?? {}

  useEffect(() => {
    if (caps.features.assetLayer) void fetchNetworkAssets()
  }, [activeNetworkId, fetchNetworkAssets, caps.features.assetLayer])

  if (!caps.features.assetLayer) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center py-14 gap-3 text-center px-6 opacity-50">
          <IoLayersOutline className="w-7 h-7 text-gray-500" />
          <p className="text-sm font-medium">Assets not supported on {activeNetwork.name}</p>
        </div>
      </div>
    )
  }

  const rawAssets = networkAssets[activeNetworkId] ?? {}
  const allEntries = Object.entries(rawAssets)

  // roots first, then subs, each group sorted alphabetically → take top 3
  const roots = allEntries.filter(([n]) => isRoot(n)).sort(([a], [b]) => a.localeCompare(b))
  const subs  = allEntries.filter(([n]) => !isRoot(n)).sort(([a], [b]) => a.localeCompare(b))
  const sorted = [...roots, ...subs]
  const preview = sorted.slice(0, 3)
  const total   = sorted.length
  const previewNames = useMemo(() => preview.map(([name]) => name), [preview])

  useEffect(() => {
    if (!supportsPreview) return
    let cancelled = false
    const checkPreviewability = async () => {
      for (const assetName of previewNames) {
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
    if (previewNames.length > 0) void checkPreviewability()
    return () => { cancelled = true }
  }, [previewNames, fetchAssetDetails, previewByAsset, supportsPreview])

  if (total === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center py-14 gap-3 text-center px-6 opacity-50">
          <IoLayersOutline className="w-7 h-7 text-gray-500" />
          <p className="text-sm font-medium">No assets on this address</p>
          <p className="text-xs text-gray-500">
            Assets you hold on {activeNetwork.name} will appear here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1">
        {preview.map(([name, raw]) => (
          <AssetPreviewRow
            key={name}
            name={name}
            displayName={nftLookup[name]?.label}
            nft={isEvmNftAssetKey(name)}
            rawAmount={raw}
            onClick={() => {
              if (canSendAssets && !isEvmNftAssetKey(name)) {
                navigate('/assets', { state: { sendAsset: name } })
                return
              }
              navigate('/assets')
            }}
            onPreview={() => {
              if (!supportsPreview) return
              navigate('/assets/preview', { state: { assetId: name } })
            }}
            previewAvailable={supportsPreview && previewByAsset[name] === true}
          />
        ))}

        {total > 3 && (
          <button
            onClick={() => navigate('/assets')}
            className="flex items-center justify-between w-full px-4 py-3.5 hover:bg-dark-700/50 transition-colors border-b border-dark-600/50 group"
          >
            <span className="text-xs font-bold text-gray-400 group-hover:text-white transition-colors">
              View all {total} assets
            </span>
            <IoChevronForward className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
          </button>
        )}
      </div>
    </div>
  )
}

export default Assets
