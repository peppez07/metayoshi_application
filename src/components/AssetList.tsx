import React from 'react'
import { useNavigate } from 'react-router-dom'
import { IoChevronForward, IoDiamondOutline } from 'react-icons/io5'
import { activeAccountOf, assetLabel, formatAsset, useWalletStore } from '../store/walletStore'

interface AssetListProps {
  query?: string
}

export const AssetList: React.FC<AssetListProps> = ({ query = '' }) => {
  const navigate = useNavigate()
  const state = useWalletStore()
  const { assets, assetInfo, assetsReady, connection } = state
  const account = activeAccountOf(state)
  const holdings = account ? assets[account.id] ?? [] : []
  const needle = query.trim().toLowerCase()

  const rows = holdings
    .map((h) => ({ ...h, info: assetInfo[h.assetId] }))
    .filter((r) => !needle || assetLabel(r.assetId, r.info).toLowerCase().includes(needle) || r.assetId.includes(needle))
    .sort((a, b) => assetLabel(a.assetId, a.info).localeCompare(assetLabel(b.assetId, b.info)))

  if (connection === 'connected' && !assetsReady) {
    return <p className="text-xs text-yellow-300 text-center py-8 px-6">The server's asset index is still synchronizing. Assets will appear when it is ready.</p>
  }
  if (rows.length === 0) {
    return <p className="text-xs text-gray-500 text-center py-8">{needle ? `No assets match "${query}"` : 'No assets on this account yet'}</p>
  }

  return (
    <div className="space-y-1.5">
      {rows.map((row) => {
        const pending = BigInt(row.unconfirmed)
        return (
          <button
            key={row.assetId}
            onClick={() => navigate(`/assets/preview?id=${row.assetId}`)}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-dark-600 bg-dark-700/40 hover:bg-dark-700 transition-colors text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                <IoDiamondOutline className="w-4 h-4 text-primary" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold truncate">{assetLabel(row.assetId, row.info)}</span>
                <span className="text-[10px] text-gray-500 font-mono truncate">
                  {row.info?.isUnique ? 'Unique · ' : ''}{row.assetId.slice(0, 10)}…
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold">{formatAsset(row.confirmed, row.info)}</span>
                {pending !== 0n && (
                  <span className="text-[10px] text-yellow-300">{pending > 0n ? '+' : ''}{formatAsset(pending, row.info)} pending</span>
                )}
              </div>
              <IoChevronForward className="w-4 h-4 text-gray-500" />
            </div>
          </button>
        )
      })}
    </div>
  )
}
