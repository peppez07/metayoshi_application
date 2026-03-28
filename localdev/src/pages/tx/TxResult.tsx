import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { IoCheckmarkCircle, IoCopyOutline, IoCheckmark, IoOpenOutline, IoHomeOutline, IoListOutline } from 'react-icons/io5'
import { Button } from '../../components/Button'
import { useWalletStore } from '../../store/walletStore'
import { buildTxExplorerUrl } from '../../lib/txExplorer'
import { getDappResultMeta, isNonBroadcastRequestMethod } from '../../lib/dappRequestDescriptors'

interface TxResultState {
  txid: string
  safeTxHash?: string
  networkId: string
  accountId?: string
  asset: string
  assetId?: string
  amount: string
  from?: string
  to?: string
  status?: string
  origin?: string
  requestMethod?: string
  returnTo?: string
  returnLabel?: string
}

const TxResult: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { networks } = useWalletStore()
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const txState = ((location.state as TxResultState | null) ?? null)
  const network = useMemo(
    () => networks.find((entry) => entry.id === txState?.networkId) || networks[0],
    [networks, txState?.networkId]
  )
  const explorerUrl = useMemo(
    () => {
      const isSafeProposal = Boolean(txState?.safeTxHash) && txState?.safeTxHash === txState?.txid
      if (isSafeProposal) return ''
      return buildTxExplorerUrl(String(network?.explorerUrl || ''), String(txState?.networkId || ''), String(txState?.txid || ''))
    },
    [network?.explorerUrl, txState?.networkId, txState?.txid, txState?.safeTxHash]
  )

  useEffect(() => {
    if (txState?.txid) return
    navigate('/wallet/activity', { replace: true })
  }, [navigate, txState?.txid])

  const copyValue = async (key: string, value: string) => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(key)
      window.setTimeout(() => setCopiedField(null), 1500)
    } catch {
      // ignore clipboard failures
    }
  }

  if (!txState?.txid) return null

  const returnTo = String(txState.returnTo || '').trim()
  const returnLabel = String(txState.returnLabel || '').trim() || 'Home'
  const isSafeProposal = Boolean(txState.safeTxHash) && txState.safeTxHash === txState.txid
  const nonBroadcast = isNonBroadcastRequestMethod(txState.requestMethod)
  const resultMeta = getDappResultMeta({
    requestMethod: txState.requestMethod,
    amount: txState.amount
  })
  const submittedValue = nonBroadcast ? resultMeta.submittedValue : `${txState.amount} ${txState.asset}`.trim()

  return (
    <div className="flex min-h-0 h-full flex-col bg-dark-800">
      <header className="shrink-0 px-4 py-3 bg-dark-900 border-b border-dark-600 flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-gray-200">{resultMeta.pageTitle}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">{network?.name || txState.networkId}</p>
        </div>
        <IoCheckmarkCircle className="w-6 h-6 text-green-400" />
      </header>

      <div className="flex-1 min-h-0 p-4 space-y-4 overflow-y-auto custom-scrollbar">
        <div className="rounded-2xl border border-green-500/25 bg-green-500/10 p-4 space-y-1">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-green-300">{resultMeta.submittedLabel}</p>
          <p className="text-sm font-bold text-white">{submittedValue}</p>
          <p className="text-[11px] text-gray-300">
            Status: <span className="font-bold capitalize">{txState.status || (nonBroadcast ? 'completed' : 'pending')}</span>
          </p>
          {txState.origin ? (
            <p className="text-[11px] text-gray-400 break-all">Requested by {txState.origin}</p>
          ) : null}
        </div>

        <DetailRow label="Network" value={`${network?.name || txState.networkId}${network?.symbol ? ` (${network.symbol})` : ''}`} />
        <DetailRow label={resultMeta.assetLabel} value={nonBroadcast ? txState.asset : txState.asset} />
        <DetailRow label={resultMeta.amountLabel} value={txState.amount} />
        <DetailRow label="From" value={txState.from || '-'} mono />
        <DetailRow label={nonBroadcast ? 'Signer' : 'To'} value={txState.to || (nonBroadcast ? '-' : 'Contract creation / network broadcast')} mono />
        {txState.requestMethod ? <DetailRow label="Method" value={txState.requestMethod} mono /> : null}

        <div className="rounded-xl border border-dark-600 bg-dark-700/30 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{nonBroadcast ? 'Request Result' : 'Transaction ID'}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              {nonBroadcast ? resultMeta.identifierLabel : (isSafeProposal ? 'Safe Tx Hash' : 'Transaction ID')}
            </span>
            <button
              type="button"
              onClick={() => void copyValue('txid', txState.txid)}
              className="p-1.5 rounded-lg hover:bg-dark-600 transition-colors"
              title={nonBroadcast ? 'Copy result' : 'Copy transaction id'}
            >
              {copiedField === 'txid'
                ? <IoCheckmark className="w-4 h-4 text-green-400" />
                : <IoCopyOutline className="w-4 h-4 text-gray-400 hover:text-white" />
              }
            </button>
          </div>
          <p className="text-[11px] font-mono break-all text-gray-200">{txState.txid}</p>
        </div>

        {explorerUrl && !nonBroadcast ? (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-dark-600 bg-dark-700/30 py-3 hover:bg-dark-700 transition-colors"
          >
            <span className="text-xs font-bold uppercase tracking-widest">Open Explorer</span>
            <IoOpenOutline className="w-4 h-4" />
          </a>
        ) : null}
      </div>

      <footer className="shrink-0 p-4 border-t border-dark-600 flex gap-3">
        <Button
          variant="outline"
          className="flex-1 btn-outline"
          onClick={() => navigate('/wallet/activity', {
            state: txState.assetId ? { assetId: txState.assetId } : undefined
          })}
        >
          <span className="inline-flex items-center gap-2">
            <IoListOutline className="w-4 h-4" />
            Activity
          </span>
        </Button>
        <Button
          className="flex-1 btn-primary"
          onClick={() => navigate(returnTo || '/wallet/assets')}
        >
          <span className="inline-flex items-center gap-2">
            <IoHomeOutline className="w-4 h-4" />
            {returnLabel}
          </span>
        </Button>
      </footer>
    </div>
  )
}

const DetailRow: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono = false }) => (
  <div className="flex items-start justify-between gap-3 rounded-xl border border-dark-600 bg-dark-700/20 px-3 py-2.5">
    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</span>
    <span className={`text-right ${mono ? 'font-mono text-[11px] break-all' : 'font-bold text-xs'}`}>
      {value}
    </span>
  </div>
)

export default TxResult
