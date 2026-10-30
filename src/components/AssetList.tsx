import React from 'react'
import { useNavigate } from 'react-router-dom'
import { IoChevronForward, IoCubeOutline, IoHourglassOutline, IoSearchOutline } from 'react-icons/io5'
import { AssetAvatar, Badge, EmptyState } from './ui'
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
    return (
      <EmptyState icon={<IoHourglassOutline className="w-6 h-6" />} title="Asset index synchronizing">
        The server is still indexing assets. They appear here automatically when it is ready.
      </EmptyState>
    )
  }
  if (rows.length === 0) {
    return needle
      ? <EmptyState icon={<IoSearchOutline className="w-6 h-6" />} title="No matches">No asset matches “{query}”.</EmptyState>
      : (
        <EmptyState icon={<IoCubeOutline className="w-6 h-6" />} title="No assets yet">
          Raptoreum assets sent to this account's address show up here.
        </EmptyState>
      )
  }

  return (
    <ul className="space-y-1">
      {rows.map((row) => {
        const pending = BigInt(row.unconfirmed)
        const name = assetLabel(row.assetId, row.info)
        return (
          <li key={row.assetId}>
            <button type="button" onClick={() => navigate(`/assets/preview?id=${row.assetId}`)} className="list-row">
              <AssetAvatar id={row.assetId} name={name} unique={row.info?.isUnique} />
              <span className="flex flex-col min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-sm font-semibold truncate">
                  <span className="truncate">{name}</span>
                  {row.info?.isUnique && <Badge tone="primary">NFT</Badge>}
                </span>
                <span className="text-[11px] text-gray-500 font-mono truncate">{row.assetId.slice(0, 8)}…{row.assetId.slice(-4)}</span>
              </span>
              <span className="flex flex-col items-end shrink-0">
                <span className="text-sm font-semibold tabular-nums">{formatAsset(row.confirmed, row.info)}</span>
                {pending !== 0n && (
                  <span className="text-[11px] text-warning tabular-nums">{pending > 0n ? '+' : ''}{formatAsset(pending, row.info)} pending</span>
                )}
              </span>
              <IoChevronForward className="w-4 h-4 text-gray-600 shrink-0" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
