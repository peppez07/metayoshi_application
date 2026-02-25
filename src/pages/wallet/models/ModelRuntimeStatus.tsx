import React from 'react'
import { Button } from '../../../components/Button'
import type { ChainModelLiveSnapshot } from '../../../store/walletStore'

interface ModelRuntimeStatusProps {
  snapshot: ChainModelLiveSnapshot | null
  loading: boolean
  onRefresh: () => void
}

function renderSync(snapshot: ChainModelLiveSnapshot | null): string {
  if (!snapshot) return 'n/a'
  if (typeof snapshot.syncPercent === 'number' && Number.isFinite(snapshot.syncPercent)) {
    return `${snapshot.syncPercent.toFixed(2)}%`
  }
  return snapshot.isSyncing ? 'syncing' : 'n/a'
}

export const ModelRuntimeStatus: React.FC<ModelRuntimeStatusProps> = ({ snapshot, loading, onRefresh }) => {
  return (
    <section className="rounded-xl border border-dark-600 bg-dark-800/60 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Live Runtime</p>
        <Button size="sm" variant="outline" onClick={onRefresh} isLoading={loading}>
          Refresh
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <RuntimeItem label="Protocol" value={snapshot?.protocol || 'n/a'} />
        <RuntimeItem label="Backend" value={snapshot?.backendMode || 'n/a'} />
        <RuntimeItem label="Balance" value={snapshot?.balance || '0'} />
        <RuntimeItem label="Sync" value={renderSync(snapshot)} />
        <RuntimeItem label="Address Valid" value={snapshot ? (snapshot.addressValid ? 'yes' : 'no') : 'n/a'} />
        <RuntimeItem label="Server Match" value={snapshot ? (snapshot.serverMatched ? 'yes' : 'no') : 'n/a'} />
        <RuntimeItem label="Custody Mode" value={snapshot?.sendCustodyMode || 'n/a'} />
        <RuntimeItem label="Non-Custodial" value={snapshot ? (snapshot.nonCustodialCompliant ? 'yes' : 'no') : 'n/a'} />
      </div>
      {snapshot?.error && (
        <div className="rounded-lg border border-red-500/30 bg-red-900/20 px-2 py-1 text-[10px] text-red-200">
          {snapshot.error}
        </div>
      )}
      <div className="text-[10px] text-gray-500 font-mono break-all">{snapshot?.address || 'No address'}</div>
    </section>
  )
}

const RuntimeItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg border border-dark-600 bg-dark-700/40 px-2 py-1.5">
    <p className="text-[9px] text-gray-500 uppercase">{label}</p>
    <p className="font-bold text-gray-200 break-all">{value}</p>
  </div>
)
