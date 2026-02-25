import React, { useMemo, useState } from 'react'
import { IoEyeOffOutline, IoLocateOutline, IoShieldHalfOutline } from 'react-icons/io5'
import { useWalletStore } from '../../../store/walletStore'

const MoneroModelPage: React.FC = () => {
  const { accounts, activeAccountId, activeNetworkId } = useWalletStore()
  const activeAccount = accounts.find((a) => a.id === activeAccountId) || accounts[0]
  const [scanMode, setScanMode] = useState<'fast' | 'balanced' | 'deep'>('balanced')
  const [subaccount, setSubaccount] = useState(0)
  const [showPrivateHints, setShowPrivateHints] = useState(false)

  const xmrAddress = useMemo(
    () => activeAccount?.networkAddresses?.[activeNetworkId] || '',
    [activeAccount, activeNetworkId]
  )

  const scanColor = scanMode === 'fast'
    ? 'text-blue-300'
    : scanMode === 'deep'
      ? 'text-red-300'
      : 'text-orange-300'

  return (
    <div className="h-full overflow-y-auto custom-scrollbar px-4 py-4 space-y-4">
      <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-dark-700/90 to-dark-900 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Monero Native</p>
          <span className="text-[9px] px-2 py-0.5 rounded-full border border-purple-500/40 text-purple-200 bg-purple-900/20">Privacy flow</span>
        </div>
        <p className="text-[11px] text-gray-400">Dedicated controls for scan depth, subaddress handling, and privacy posture.</p>
      </section>

      <section className="rounded-xl border border-dark-600 bg-dark-800/60 p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-300 uppercase">
          <IoLocateOutline className="w-4 h-4 text-primary" />
          Sync Scanner
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(['fast', 'balanced', 'deep'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setScanMode(mode)}
              className={`rounded-lg border py-1.5 text-[10px] font-bold uppercase ${
                scanMode === mode ? 'border-primary/50 bg-primary/15 text-orange-200' : 'border-dark-600 bg-dark-700/40 text-gray-400'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        <p className={`text-[11px] ${scanColor}`}>Current mode: {scanMode}</p>
      </section>

      <section className="rounded-xl border border-dark-600 bg-dark-800/60 p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-300 uppercase">
          <IoEyeOffOutline className="w-4 h-4 text-primary" />
          Subaddress Lane
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubaccount((v) => Math.max(0, v - 1))}
            className="w-8 h-8 rounded-full border border-dark-600 bg-dark-700/50 text-gray-300"
          >
            -
          </button>
          <div className="flex-1 rounded-lg border border-dark-600 bg-dark-700/40 py-2 text-center text-sm font-bold">
            Subaccount {subaccount}
          </div>
          <button
            type="button"
            onClick={() => setSubaccount((v) => v + 1)}
            className="w-8 h-8 rounded-full border border-dark-600 bg-dark-700/50 text-gray-300"
          >
            +
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-dark-600 bg-dark-800/60 p-3 space-y-2">
        <label className="flex items-center justify-between cursor-pointer">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-300 uppercase">
            <IoShieldHalfOutline className="w-4 h-4 text-primary" />
            Privacy Hints
          </div>
          <input
            type="checkbox"
            checked={showPrivateHints}
            onChange={(e) => setShowPrivateHints(e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
        </label>
        {showPrivateHints && (
          <p className="text-[11px] text-gray-400">
            Keep randomized output selection, avoid address reuse, and use deep scan before large transfers.
          </p>
        )}
      </section>

      <div className="rounded-lg border border-dark-600 bg-dark-800/40 p-2 text-[10px] font-mono text-gray-500 break-all">
        {xmrAddress || 'No Monero address available'}
      </div>
    </div>
  )
}

export default MoneroModelPage
