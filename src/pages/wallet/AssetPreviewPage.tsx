import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { IoArrowUpOutline, IoOpenOutline } from 'react-icons/io5'
import { Button } from '../../components/Button'
import { AssetAvatar, Badge, DetailRow, Notice, PageHeader, Skeleton } from '../../components/ui'
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
    if (!isValidAssetId(assetId)) {
      setError('This is not a valid asset ID.')
      return
    }
    if (info || connection !== 'connected') return
    void loadAssetInfo(assetId).then((result) => {
      if (result) setInfo(result)
      else setError('Asset metadata was not found on the server.')
    })
  }, [assetId, info, connection, loadAssetInfo])

  const name = assetLabel(assetId, info ?? undefined)
  const canSend = !!holding && BigInt(holding.confirmed) > 0n && connection === 'connected'

  return (
    <div className="flex flex-col h-full">
      <PageHeader title={name} />
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-4">
        <div className="card px-5 py-6 flex flex-col items-center text-center gap-3">
          <AssetAvatar id={assetId || '0'} name={name} size={56} unique={info?.isUnique} />
          <div>
            <p className="text-[30px] font-bold leading-tight tabular-nums">{formatAsset(holding?.confirmed ?? '0', info ?? undefined)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{name} · {account?.name}</p>
          </div>
          <div className="flex gap-1.5">
            {info ? (
              <>
                <Badge tone={info.isUnique ? 'primary' : 'neutral'}>{info.isUnique ? 'Unique' : 'Fungible'}</Badge>
                {info.isRoot ? <Badge>Root</Badge> : <Badge>Sub-asset</Badge>}
                {info.updatable && <Badge>Updatable</Badge>}
              </>
            ) : !error && <Skeleton className="h-5 w-32" />}
          </div>
          {holding && BigInt(holding.unconfirmed) !== 0n && (
            <p className="text-xs text-warning">{formatAsset(holding.unconfirmed, info ?? undefined)} pending confirmation</p>
          )}
        </div>

        {error && <Notice tone="error">{error}</Notice>}

        <div className="card px-4 py-1 divide-y divide-white/[0.05]">
          <DetailRow label="Asset ID" value={assetId} mono copy={assetId} />
          {info ? (
            <>
              <DetailRow label="Decimals" value={String(info.decimalPoint)} />
              <DetailRow label="Circulating supply" value={formatAsset(info.supply, info)} />
              <DetailRow label="Mints" value={info.maxMintCount ? `${info.mintCount} of ${info.maxMintCount}` : String(info.mintCount)} />
              <DetailRow label="Created at block" value={info.creationHeight ? info.creationHeight.toLocaleString('en-US') : 'Unknown'} />
              {info.referenceHash && (
                <DetailRow
                  label="Reference"
                  mono
                  value={isIpfsCid(info.referenceHash)
                    ? <a href={`https://ipfs.io/ipfs/${info.referenceHash}`} target="_blank" rel="noreferrer" className="text-primary-300 hover:underline inline-flex items-center gap-1">{info.referenceHash} <IoOpenOutline className="w-3 h-3 shrink-0" /></a>
                    : info.referenceHash}
                />
              )}
            </>
          ) : !error && (
            <div className="py-3 space-y-2"><Skeleton className="h-4" /><Skeleton className="h-4 w-2/3" /></div>
          )}
        </div>
      </div>

      <footer className="p-4 pt-2">
        <Button className="w-full" size="lg" disabled={!canSend} onClick={() => navigate(`/assets/send?id=${assetId}`)}>
          <IoArrowUpOutline className="w-4 h-4" /> Send
        </Button>
      </footer>
    </div>
  )
}

export default AssetPreviewPage
