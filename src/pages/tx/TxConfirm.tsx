import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { IoCheckmark, IoOpenOutline, IoShieldCheckmarkOutline } from 'react-icons/io5'
import { Button } from '../../components/Button'
import { AssetAvatar, DetailRow, Notice, PageHeader, Skeleton, shortAddress } from '../../components/ui'
import { parseUnits, formatUnits } from '../../lib/rtm/amount'
import { EXPLORER_URL, RTM_SYMBOL, useWalletStore, type PreparedSend } from '../../store/walletStore'
import rtmLogo from '../../assets/raptoreum.png'

export type SendRequest =
  | { kind: 'rtm'; to: string; amount: string; sendMax?: boolean }
  | { kind: 'asset'; assetId: string; to: string; amount: string }

/** Builds and signs locally; nothing leaves the wallet until broadcast(). */
export function usePreparedSend(request: SendRequest | null) {
  const { prepareRtmSend, prepareAssetSend, connection } = useWalletStore()
  const [prepared, setPrepared] = useState<PreparedSend | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const key = JSON.stringify(request)

  useEffect(() => {
    if (!request || connection !== 'connected') return
    let cancelled = false
    setLoading(true)
    setError('')
    const run = request.kind === 'rtm'
      ? prepareRtmSend({ to: request.to, amount: request.amount, sendMax: request.sendMax })
      : prepareAssetSend({ assetId: request.assetId, to: request.to, amount: request.amount })
    run
      .then((result) => { if (!cancelled) setPrepared(result) })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : String(err)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [key, connection])

  return { prepared, error, loading: loading || (!!request && connection !== 'connected' && !error) }
}

export const SendSummary: React.FC<{ prepared: PreparedSend }> = ({ prepared }) => {
  const isAsset = prepared.kind === 'asset'
  const total = isAsset ? null : formatUnits(parseUnits(prepared.amount, 8) + parseUnits(prepared.fee, 8), 8)
  return (
    <div className="space-y-3">
      <div className="card px-5 py-5 flex flex-col items-center text-center gap-2">
        {isAsset
          ? <AssetAvatar id={prepared.assetId ?? '0'} name={prepared.assetName ?? 'Asset'} size={44} />
          : <img src={rtmLogo} alt="" className="w-11 h-11 rounded-full bg-white p-1" />}
        <p className="text-xs text-gray-400">You are sending</p>
        <p className="text-[26px] font-bold leading-tight tabular-nums break-all">
          {prepared.amount} {isAsset ? (prepared.assetName ?? prepared.assetId) : RTM_SYMBOL}
        </p>
        <p className="text-xs text-gray-400">to <span className="font-mono text-gray-200">{shortAddress(prepared.to, 8, 8)}</span></p>
      </div>
      <div className="card px-4 py-1 divide-y divide-white/[0.05]">
        <DetailRow label="To" value={prepared.to} mono copy={prepared.to} />
        <DetailRow label="From" value={prepared.from} mono />
        <DetailRow label="Network fee" value={`${prepared.fee} ${RTM_SYMBOL}`} />
        {total && <DetailRow label="Total" value={`${total} ${RTM_SYMBOL}`} emphasis />}
      </div>
      <details className="card-flat px-4 py-2.5 group">
        <summary className="text-xs text-gray-400 cursor-pointer select-none list-none flex justify-between">
          Technical details <span className="text-gray-600 group-open:rotate-90 transition-transform">›</span>
        </summary>
        <div className="divide-y divide-white/[0.05] mt-1">
          <DetailRow label="Transaction ID" value={prepared.txid} mono copy={prepared.txid} />
          <DetailRow label="Size" value={`${prepared.size} bytes`} />
        </div>
      </details>
    </div>
  )
}

const TxConfirm: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const request = (location.state ?? null) as SendRequest | null
  const { broadcast } = useWalletStore()
  const { prepared, error, loading } = usePreparedSend(request)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [txid, setTxid] = useState('')

  const confirm = async () => {
    if (!prepared) return
    setSubmitting(true)
    setSubmitError('')
    try {
      setTxid(await broadcast(prepared))
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (txid) {
    return (
      <div className="flex flex-col h-full px-6 pb-6">
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-success/15 text-success flex items-center justify-center shadow-[0_0_40px_-8px_rgba(52,211,153,0.6)]">
            <IoCheckmark className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Transaction broadcast</h2>
            <p className="text-xs text-gray-400">It will appear in Activity once the network sees it.</p>
          </div>
          <p className="font-mono text-[11px] text-gray-500 break-all px-2">{txid}</p>
          <a href={`${EXPLORER_URL}/tx/${txid}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary-300 hover:underline">
            View on explorer <IoOpenOutline className="w-3 h-3" />
          </a>
        </div>
        <Button size="lg" className="w-full" onClick={() => navigate('/wallet/activity', { replace: true })}>Done</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Review transaction" back={() => navigate(-1)} />
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-3">
        {!request && <Notice tone="info">Nothing to confirm.</Notice>}
        {loading && (
          <div className="space-y-3" aria-label="Building and signing transaction locally">
            <Skeleton className="h-40 rounded-3xl" />
            <Skeleton className="h-28 rounded-3xl" />
            <p className="text-xs text-gray-500 text-center">Building and signing locally…</p>
          </div>
        )}
        {prepared && <SendSummary prepared={prepared} />}
        {(error || submitError) && <Notice tone="error" title="Transaction not sent">{error || submitError}</Notice>}
        {prepared && (
          <p className="flex gap-2 text-[11px] text-gray-500 leading-relaxed px-1">
            <IoShieldCheckmarkOutline className="w-4 h-4 shrink-0 text-success/80" />
            Signed in this browser with your key. Only the signed transaction is sent to the ElectrumX server. Transactions cannot be reversed.
          </p>
        )}
      </div>
      <footer className="p-4 pt-2 flex gap-3">
        <Button variant="secondary" size="lg" className="flex-1" onClick={() => navigate(-1)} disabled={submitting}>Back</Button>
        <Button size="lg" className="flex-1" onClick={() => void confirm()} isLoading={submitting} disabled={!prepared}>Confirm</Button>
      </footer>
    </div>
  )
}

export default TxConfirm
