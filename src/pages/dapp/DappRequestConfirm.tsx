import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { IoGlobeOutline, IoMailOpenOutline } from 'react-icons/io5'
import { EmptyState, Notice, PageHeader, Skeleton } from '../../components/ui'
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
    <div className="flex flex-col h-full">
      <PageHeader title="Transaction request" back={false} />
      <div className="flex-1 px-4 py-4 space-y-3 overflow-y-auto custom-scrollbar">
        <div className="card-flat flex items-center gap-3 px-4 py-3">
          <span className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.06] flex items-center justify-center text-gray-300">
            <IoGlobeOutline className="w-[18px] h-[18px]" />
          </span>
          <span className="flex flex-col min-w-0">
            <span className="text-sm font-semibold truncate">{originHost(pending.origin)}</span>
            <span className="text-[11px] text-gray-500">wants to {pending.method === 'wallet_sendAsset' ? 'send an asset' : 'send RTM'} from your wallet</span>
          </span>
        </div>
        {loading && <><Skeleton className="h-40 rounded-3xl" /><p className="text-xs text-gray-500 text-center">Building and signing locally…</p></>}
        {prepared && <SendSummary prepared={prepared} />}
        {shownError && <Notice tone="error" title="Cannot approve">{shownError}</Notice>}
      </div>
      <footer className="p-4 pt-2 flex gap-3">
        <Button variant="secondary" size="lg" className="flex-1" onClick={() => void reject()} disabled={submitting}>Reject</Button>
        <Button size="lg" className="flex-1" onClick={() => void approve()} isLoading={submitting} disabled={!prepared}>Approve</Button>
      </footer>
    </div>
  )
}

function originHost(origin: string): string {
  try {
    return new URL(origin).host
  } catch {
    return origin
  }
}

const DappRequestConfirm: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
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
    ? <div className="flex items-center justify-center h-full"><span className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin-smooth" /></div>
    : pending
      ? <Review pending={pending} />
      : (
        <div className="flex flex-col h-full">
          <PageHeader title="Transaction request" back={false} />
          <div className="flex-1 flex items-center">
            <EmptyState icon={<IoMailOpenOutline className="w-6 h-6" />} title="No pending request" action={
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => window.close()}>Close</Button>
                <Button size="sm" onClick={() => navigate('/wallet/assets')}>Open wallet</Button>
              </div>
            }>
              The request was already handled, expired, or was cancelled by the site.
            </EmptyState>
          </div>
        </div>
      )

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
