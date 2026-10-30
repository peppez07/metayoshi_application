import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { IoCheckmarkCircle, IoOpenOutline } from 'react-icons/io5'
import { Button } from '../../components/Button'
import { EXPLORER_URL, RTM_SYMBOL, useWalletStore, type PreparedSend } from '../../store/walletStore'

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

export const SendSummary: React.FC<{ prepared: PreparedSend }> = ({ prepared }) => (
  <div className="p-4 rounded-xl border border-dark-600 bg-dark-700/50 space-y-3">
    <Row label="From" value={prepared.from} mono />
    <Row label="To" value={prepared.to} mono />
    {prepared.kind === 'asset'
      ? <Row label="Asset" value={`${prepared.amount} ${prepared.assetName ?? prepared.assetId}`} />
      : <Row label="Amount" value={`${prepared.amount} ${RTM_SYMBOL}`} />}
    <Row label="Network fee" value={`${prepared.fee} ${RTM_SYMBOL} · ${prepared.size} bytes`} />
    <Row label="Transaction ID" value={prepared.txid} mono />
  </div>
)

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
      <div className="flex flex-col items-center justify-center h-full bg-dark-800 p-8 gap-5 text-center">
        <IoCheckmarkCircle className="w-16 h-16 text-green-400" />
        <div className="space-y-1">
          <h2 className="text-lg font-bold">Transaction broadcast</h2>
          <p className="text-[11px] font-mono text-gray-400 break-all">{txid}</p>
        </div>
        <a href={`${EXPLORER_URL}/tx/${txid}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
          View on explorer <IoOpenOutline className="w-3 h-3" />
        </a>
        <Button className="w-full" onClick={() => navigate('/wallet/activity', { replace: true })}>Done</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-dark-800">
      <header className="p-4 flex items-center justify-center border-b border-dark-600">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Confirm Transaction</span>
      </header>

      <div className="flex-1 p-6 space-y-4 overflow-y-auto custom-scrollbar">
        {!request && <p className="text-sm text-gray-400 text-center">Nothing to confirm.</p>}
        {loading && <p className="text-xs text-gray-400 text-center">Building and signing transaction locally…</p>}
        {prepared && <SendSummary prepared={prepared} />}
        {(error || submitError) && (
          <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
            <p className="text-xs font-bold text-red-300 break-words">{error || submitError}</p>
          </div>
        )}
        {prepared && (
          <p className="text-[10px] text-gray-500 leading-relaxed">
            Signed in this browser with your key. Only the signed transaction is sent to the ElectrumX server. Transactions cannot be reversed.
          </p>
        )}
      </div>

      <footer className="p-4 border-t border-dark-600 flex gap-4">
        <Button variant="outline" className="flex-1" onClick={() => navigate(-1)} disabled={submitting}>
          Back
        </Button>
        <Button className="flex-1 btn-primary" onClick={() => void confirm()} isLoading={submitting} disabled={!prepared}>
          Confirm
        </Button>
      </footer>
    </div>
  )
}

export const Row: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono = false }) => (
  <div className="flex flex-col gap-1">
    <p className="text-[10px] text-gray-500 uppercase tracking-widest">{label}</p>
    <p className={mono ? 'text-xs text-gray-200 font-mono break-all' : 'text-sm text-gray-200'}>{value}</p>
  </div>
)

export default TxConfirm
