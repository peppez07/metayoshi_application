import React, { useMemo, useState } from 'react'
import { IoGitNetworkOutline, IoLeafOutline, IoPulseOutline } from 'react-icons/io5'
import { useWalletStore } from '../../../store/walletStore'

const CardanoModelPage: React.FC = () => {
  const { accounts, activeAccountId, activeNetworkId } = useWalletStore()
  const [view, setView] = useState<'utxo' | 'staking' | 'policies'>('utxo')
  const activeAccount = accounts.find((a) => a.id === activeAccountId) || accounts[0]

  const cardanoAddress = useMemo(
    () => activeAccount?.networkAddresses?.[activeNetworkId] || '',
    [activeAccount, activeNetworkId]
  )

  return (
    <div className="h-full overflow-y-auto custom-scrollbar px-4 py-4 space-y-4">
      <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-dark-700/90 to-dark-900 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Cardano Native</p>
          <span className="text-[9px] px-2 py-0.5 rounded-full border border-emerald-500/40 text-emerald-300 bg-emerald-900/20">EUTXO model</span>
        </div>
        <p className="text-[11px] text-gray-400">Split flows for UTXO management, staking posture, and policy-asset orchestration.</p>
      </section>

      <section className="rounded-xl border border-dark-600 bg-dark-800/60 p-3 space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <ModelTab icon={<IoGitNetworkOutline className="w-4 h-4" />} label="UTXO" active={view === 'utxo'} onClick={() => setView('utxo')} />
          <ModelTab icon={<IoLeafOutline className="w-4 h-4" />} label="Staking" active={view === 'staking'} onClick={() => setView('staking')} />
          <ModelTab icon={<IoPulseOutline className="w-4 h-4" />} label="Policies" active={view === 'policies'} onClick={() => setView('policies')} />
        </div>
      </section>

      {view === 'utxo' && (
        <section className="rounded-xl border border-dark-600 bg-dark-800/60 p-3">
          <p className="text-xs font-bold uppercase text-gray-300 mb-2">EUTXO Lens</p>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <StatCard label="Spendable UTXOs" value="27" />
            <StatCard label="Locked Outputs" value="3" />
            <StatCard label="Change Fragments" value="9" />
            <StatCard label="Avg Output ADA" value="18.6" />
          </div>
        </section>
      )}

      {view === 'staking' && (
        <section className="rounded-xl border border-dark-600 bg-dark-800/60 p-3 space-y-2">
          <p className="text-xs font-bold uppercase text-gray-300">Stake Posture</p>
          <div className="rounded-lg border border-dark-600 bg-dark-700/40 p-2 text-[11px] text-gray-300">
            Delegation status preview for this account model page.
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-gray-500">Current pool:</span>
            <span className="font-bold text-gray-200">None selected</span>
          </div>
        </section>
      )}

      {view === 'policies' && (
        <section className="rounded-xl border border-dark-600 bg-dark-800/60 p-3 space-y-2">
          <p className="text-xs font-bold uppercase text-gray-300">Policy Assets</p>
          <div className="space-y-2">
            {['Policy A1...2F', 'Policy B4...90', 'Policy C8...11'].map((p) => (
              <div key={p} className="rounded-lg border border-dark-600 bg-dark-700/40 px-2 py-1.5 text-[10px] font-mono text-gray-300">
                {p}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="rounded-lg border border-dark-600 bg-dark-800/40 p-2 text-[10px] font-mono text-gray-500 break-all">
        {cardanoAddress || 'No Cardano address available'}
      </div>
    </div>
  )
}

const ModelTab: React.FC<{ icon: React.ReactNode; label: string; active: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-lg border py-2 text-[10px] font-bold uppercase flex items-center justify-center gap-1 ${
      active ? 'border-primary/50 bg-primary/15 text-orange-200' : 'border-dark-600 bg-dark-700/40 text-gray-400'
    }`}
  >
    {icon}
    {label}
  </button>
)

const StatCard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg border border-dark-600 bg-dark-700/30 p-2">
    <p className="text-[10px] text-gray-500">{label}</p>
    <p className="text-sm font-bold text-gray-200">{value}</p>
  </div>
)

export default CardanoModelPage
