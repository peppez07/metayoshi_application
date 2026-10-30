import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { IoArrowBack, IoArrowUpOutline, IoOpenOutline } from 'react-icons/io5'
import { Button } from '../../components/Button'
import { isValidAssetId } from '../../lib/rtm/assetScript'
import { activeAccountOf, assetLabel, formatAsset, useWalletStore, type AssetInfo } from '../../store/walletStore'

function isIpfsCid(value: string): boolean {
  return /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{58,})$/.test(value)
}

const AssetPreviewPage: React.FC = () => {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const assetId = String(params.get('id') || '')
  const state = useWalletStore()
  const { loadAssetInfo, assets, connection } = state
  const account = activeAccountOf(state)
  const holding = account ? (assets[account.id] ?? []).find((h) => h.assetId === assetId) : undefined
  const [info, setInfo] = useState<AssetInfo | null>(state.assetInfo[assetId] ?? null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isValidAssetId(assetId) || info || connection !== 'connected') return
    void loadAssetInfo(assetId).then((result) => {
      if (result) setInfo(result)
      else setError('Asset metadata not found')
    })
  }, [assetId, info, connection, loadAssetInfo])

  const rows: Array<[string, string, boolean?]> = info
    ? [
        ['Asset ID', assetId, true],
        ['Type', info.isUnique ? 'Unique (NFT)' : 'Fungible'],
        ['Decimals', String(info.decimalPoint)],
        ['Circulating supply', formatAsset(info.supply, info)],
        ['Mints', info.maxMintCount ? `${info.mintCount} / ${info.maxMintCount}` : String(info.mintCount)],
        ['Updatable', info.updatable ? 'Yes' : 'No'],
        ['Created at block', info.creationHeight ? String(info.creationHeight) : '—'],
        ['Reference', info.referenceHash || '—', true]
      ]
    : [['Asset ID', assetId, true]]

  return (
    <div className="flex flex-col h-full bg-dark-800">
      <header className="p-4 flex items-center gap-3 border-b border-dark-600">
        <button onClick={() => navigate(-1)} className="p-1 rounded-lg hover:bg-dark-700">
          <IoArrowBack className="w-5 h-5" />
        </button>
        <span className="text-sm font-bold truncate">{assetLabel(assetId, info ?? undefined)}</span>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
        <div className="text-center space-y-1">
          <p className="text-3xl font-bold">{formatAsset(holding?.confirmed ?? '0', info ?? undefined)}</p>
          <p className="text-xs text-gray-400">balance on {account?.name}</p>
          {holding && BigInt(holding.unconfirmed) !== 0n && (
            <p className="text-[11px] text-yellow-300">{formatAsset(holding.unconfirmed, info ?? undefined)} pending</p>
          )}
        </div>

        <div className="p-4 rounded-xl border border-dark-600 bg-dark-700/40 space-y-3">
          {rows.map(([label, value, mono]) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest">{label}</span>
              <span className={mono ? 'text-[11px] font-mono break-all text-gray-200' : 'text-sm text-gray-200'}>{value}</span>
            </div>
          ))}
          {info && isIpfsCid(info.referenceHash) && (
            <a
              href={`https://ipfs.io/ipfs/${info.referenceHash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Open reference on IPFS <IoOpenOutline className="w-3 h-3" />
            </a>
          )}
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      </div>

      <footer className="p-4 border-t border-dark-600">
        <Button
          className="w-full"
          disabled={!holding || BigInt(holding.confirmed) <= 0n || connection !== 'connected'}
          onClick={() => navigate(`/assets/send?id=${assetId}`)}
        >
          <IoArrowUpOutline className="w-4 h-4" /> Send
        </Button>
      </footer>
    </div>
  )
}

export default AssetPreviewPage
