import React, { useState } from 'react'
import { IoConstructOutline, IoOptionsOutline } from 'react-icons/io5'
import { ModelRuntimeStatus } from './ModelRuntimeStatus'
import { useChainModelLiveData } from './useChainModelLiveData'

const UtxoClassicModelPage: React.FC = () => {
  const [feePreset, setFeePreset] = useState<'low' | 'normal' | 'high'>('normal')
  const [coinControl, setCoinControl] = useState(false)
  const { snapshot, loading, refresh } = useChainModelLiveData()

  return (
    <div className="h-full overflow-y-auto custom-scrollbar px-4 py-4 space-y-4">
      <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-dark-700/90 to-dark-900 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Classic UTXO Console</p>
        <p className="text-[11px] text-gray-400 mt-2">Focused fee and input-control workflow for Bitcoin-like chains.</p>
      </section>

      <section className="rounded-xl border border-dark-600 bg-dark-800/60 p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase text-gray-300">
          <IoOptionsOutline className="w-4 h-4 text-primary" />
          Fee Preset
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(['low', 'normal', 'high'] as const).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setFeePreset(preset)}
              className={`rounded-lg border py-1.5 text-[10px] font-bold uppercase ${
                feePreset === preset ? 'border-primary/50 bg-primary/15 text-orange-200' : 'border-dark-600 bg-dark-700/40 text-gray-400'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-dark-600 bg-dark-800/60 p-3 space-y-2">
        <label className="flex items-center justify-between cursor-pointer">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-gray-300">
            <IoConstructOutline className="w-4 h-4 text-primary" />
            Coin Control
          </div>
          <input
            type="checkbox"
            checked={coinControl}
            onChange={(e) => setCoinControl(e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
        </label>
        <p className="text-[11px] text-gray-400">
          {coinControl
            ? 'Manual input selection enabled. You can prefer specific UTXOs.'
            : 'Automatic input selection enabled. Wallet optimizes spend path.'}
        </p>
      </section>

      <section className="rounded-xl border border-dark-600 bg-dark-800/60 p-3 text-[11px] text-gray-300">
        Local preference only: <span className="font-bold uppercase">{feePreset}</span> preset, <span className="font-bold">{coinControl ? 'manual' : 'automatic'}</span> input strategy.
      </section>

      <ModelRuntimeStatus snapshot={snapshot} loading={loading} onRefresh={() => void refresh()} />
    </div>
  )
}

export default UtxoClassicModelPage
