import React, { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button } from '../../components/Button'
import { PasswordGate } from '../../components/PasswordGate'
import { DAPP_PENDING_REQUEST_STORAGE_KEY, parseDappPendingRequest, type DappPendingRequest } from '../../lib/dappPermissions'
import { isValidAssetId } from '../../lib/rtm/assetScript'
import { useWalletStore } from '../../store/walletStore'
import { SendSummary, usePreparedSend, type SendRequest } from '../tx/TxConfirm'

function canUseChromeStorage(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local)
}

async function updatePending(pending: DappPendingRequest, patch: Partial<DappPendingRequest>): Promise<void> {
  if (!canUseChromeStorage()) return
  await chrome.storage.local.set({ [DAPP_PENDING_REQUEST_STORAGE_KEY]: { ...pending, ...patch, updatedAt: Date.now() } })
}

function toSendRequest(pending: DappPendingRequest | null): { request: SendRequest | null; error: string } {
  if (!pending) return { request: null, error: '' }
  const body = pending.request as any
  if (pending.method === 'wallet_sendAsset') {
    const assetId = String(body?.assetId || '').trim().toLowerCase()
    if (!isValidAssetId(assetId)) return { request: null, error: 'The dApp must identify the asset by its 64-character asset ID.' }
    return { request: { kind: 'asset', assetId, to: String(body?.toAddress || ''), amount: String(body?.qty || '') }, error: '' }
  }
  return { request: { kind: 'rtm', to: String(body?.to || ''), amount: String(body?.amount || '') }, error: '' }
}

const Review: React.FC<{ pending: DappPendingRequest }> = ({ pending }) => {
  const { connect, connection, setActiveAccount, activeAccountId, broadcast } = useWalletStore()
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const accountReady = activeAccountId === pending.accountId
  const { request, error: requestError } = useMemo(() => toSendRequest(pending), [pending])
  const { prepared, error, loading } = usePreparedSend(accountReady ? request : null)

  useEffect(() => {
    if (!accountReady) setActiveAccount(pending.accountId)
    if (connection === 'disconnected') void connect()
  }, [accountReady, pending.accountId, connection, connect, setActiveAccount])

  const finish = () => window.close()

  const reject = async () => {
    await updatePending(pending, { status: 'rejected', error: { code: 4001, message: 'User rejected the request' } })
    finish()
  }

  const approve = async () => {
    if (!prepared) return
    setSubmitting(true)
    setSubmitError('')
    await updatePending(pending, { status: 'approved' })
    try {
      const txid = await broadcast(prepared)
      await updatePending(pending, { status: 'executed', result: { hash: txid, txid } })
      finish()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setSubmitError(message)
      await updatePending(pending, { status: 'failed', error: { code: -32603, message } })
    } finally {
      setSubmitting(false)
    }
  }

  const shownError = requestError || error || submitError
  return (
    <div className="flex flex-col h-full bg-dark-800">
      <header className="p-4 flex items-center justify-between border-b border-dark-600">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">dApp Transaction Request</span>
      </header>
      <div className="flex-1 p-6 space-y-4 overflow-y-auto custom-scrollbar">
        <div className="space-y-1 text-center">
          <h2 className="text-lg font-bold">{pending.method === 'wallet_sendAsset' ? 'Send asset' : 'Send RTM'}</h2>
          <p className="text-xs text-gray-400 break-all">{pending.origin}</p>
        </div>
        {loading && <p className="text-xs text-gray-400 text-center">Building and signing transaction locally…</p>}
        {prepared && <SendSummary prepared={prepared} />}
        {shownError && (
          <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
            <p className="text-xs font-bold text-red-300 break-words">{shownError}</p>
          </div>
        )}
      </div>
      <footer className="p-4 border-t border-dark-600 flex gap-4">
        <Button variant="outline" className="flex-1" onClick={() => void reject()} disabled={submitting}>Reject</Button>
        <Button className="flex-1 btn-primary" onClick={() => void approve()} isLoading={submitting} disabled={!prepared}>Approve</Button>
      </footer>
    </div>
  )
}

const DappRequestConfirm: React.FC = () => {
  const location = useLocation()
  const { isLocked } = useWalletStore()
  const [pending, setPending] = useState<DappPendingRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const requestedId = useMemo(() => new URLSearchParams(location.search).get('id') || '', [location.search])

  useEffect(() => {
    if (!canUseChromeStorage()) {
      setLoading(false)
      return
    }
    let mounted = true
    const apply = (raw: unknown) => {
      const parsed = parseDappPendingRequest(raw)
      if (!mounted) return
      const valid = parsed && (!requestedId || parsed.id === requestedId) && (parsed.status === 'pending' || parsed.status === 'approved')
      setPending(valid ? parsed : null)
      setLoading(false)
    }
    void chrome.storage.local.get(DAPP_PENDING_REQUEST_STORAGE_KEY).then((r) => apply(r[DAPP_PENDING_REQUEST_STORAGE_KEY])).catch(() => apply(null))
    const onChanged = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === 'local' && changes[DAPP_PENDING_REQUEST_STORAGE_KEY]) apply(changes[DAPP_PENDING_REQUEST_STORAGE_KEY].newValue)
    }
    chrome.storage.onChanged.addListener(onChanged)
    return () => {
      mounted = false
      chrome.storage.onChanged.removeListener(onChanged)
    }
  }, [requestedId])

  const content = loading
    ? <div className="flex items-center justify-center h-full text-xs text-gray-400">Loading request…</div>
    : pending
      ? <Review pending={pending} />
      : <div className="flex items-center justify-center h-full text-sm text-gray-400">No pending transaction request.</div>

  if (isLocked) {
    return (
      <PasswordGate title="Unlock to review request" description="Enter your wallet password to review this dApp request.">
        {content}
      </PasswordGate>
    )
  }
  return content
}

export default DappRequestConfirm
