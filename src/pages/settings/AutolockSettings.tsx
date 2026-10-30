import React from 'react'
import clsx from 'clsx'
import { IoCheckmark } from 'react-icons/io5'
import { useWalletStore } from '../../store/walletStore'

const OPTIONS: Array<[number, string]> = [[1, '1 minute'], [5, '5 minutes'], [10, '10 minutes'], [15, '15 minutes'], [30, '30 minutes'], [60, '1 hour'], [0, 'Never']]

const AutolockSettings: React.FC = () => {
  const { autolockMinutes, setAutolock } = useWalletStore()
  return (
    <div className="px-4 py-4 space-y-4">
      <p className="text-xs text-gray-400 leading-relaxed px-1">
        Lock the wallet after this much inactivity. Unlocking needs your password; the recovery phrase is cleared from memory when locked.
      </p>
      <div className="card p-1.5" role="radiogroup" aria-label="Auto-lock delay">
        {OPTIONS.map(([minutes, label]) => {
          const selected = autolockMinutes === minutes
          return (
            <button key={minutes} type="button" role="radio" aria-checked={selected} className="list-row" onClick={() => setAutolock(minutes)}>
              <span className={clsx('flex-1 text-sm', selected ? 'font-semibold text-white' : 'text-gray-300')}>{label}</span>
              <span className={clsx('w-5 h-5 rounded-full border flex items-center justify-center', selected ? 'bg-primary border-primary' : 'border-white/20')}>
                {selected && <IoCheckmark className="w-3.5 h-3.5 text-white" />}
              </span>
            </button>
          )
        })}
      </div>
      {autolockMinutes === 0 && (
        <p className="text-[11px] text-warning px-1">Without auto-lock, anyone with access to this browser can use the wallet while it is open.</p>
      )}
    </div>
  )
}

export default AutolockSettings
