import React, { useMemo, useState } from 'react'
import { IoFlashOutline, IoLayersOutline, IoSparklesOutline } from 'react-icons/io5'
import { useWalletStore } from '../../../store/walletStore'

type GasLane = 'economy' | 'balanced' | 'priority'

const EvmModelPage: React.FC = () => {
  const { accounts, activeAccountId, activeNetworkId } = useWalletStore()
  const activeAccount = accounts.find((a) => a.id === activeAccountId) || accounts[0]
  const [gasLane, setGasLane] = useState<GasLane>('balanced')
  const [intent, setIntent] = useState<'swap' | 'send' | 'approve'>('send')

  const evmAddress = useMemo(
    () => activeAccount?.networkAddresses?.[activeNetworkId] || activeAccount?.addresses?.EVM || '',
    [activeAccount, activeNetworkId]
  )

  const gasPalette: Record<GasLane, string> = {
    economy: 'border-blue-500/40 bg-blue-900/10 text-blue-200',
    balanced: 'border-primary/40 bg-primary/10 text-orange-200',
    priority: 'border-red-500/40 bg-red-900/10 text-red-200'
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar px-4 py-4 space-y-4">
      <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-dark-700/90 to-dark-900 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Ethereum Lab</p>
          <span className="text-[9px] px-2 py-0.5 rounded-full border border-yellow-500/40 text-yellow-300 bg-yellow-900/20">Design mode</span>
        </div>
        <p className="text-[11px] text-gray-400">Intent-centric flow preview with lane-based gas UX.</p>
      </section>

      <section className="rounded-xl border border-dark-600 bg-dark-800/60 p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-300 uppercase">
          <IoFlashOutline className="w-4 h-4 text-primary" />
          Gas Orbit
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(['economy', 'balanced', 'priority'] as const).map((lane) => (
            <button
              key={lane}
              type="button"
              onClick={() => setGasLane(lane)}
              className={`rounded-lg border p-2 text-[10px] font-bold uppercase transition-colors ${
                gasLane === lane ? gasPalette[lane] : 'border-dark-600 bg-dark-700/40 text-gray-400 hover:text-white'
              }`}
            >
              {lane}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-dark-600 bg-dark-800/60 p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-300 uppercase">
          <IoLayersOutline className="w-4 h-4 text-primary" />
          Token Field
        </div>
        <div className="flex flex-wrap gap-2">
          {['ETH', 'USDT', 'SHIB', 'WBTC', 'UNI'].map((token) => (
            <span key={token} className="px-2 py-1 rounded-full border border-dark-600 bg-dark-700/50 text-[10px] font-bold text-gray-300">
              {token}
            </span>
          ))}
        </div>
        <p className="text-[10px] text-gray-500 font-mono break-all">{evmAddress || 'No EVM address available'}</p>
      </section>

      <section className="rounded-xl border border-dark-600 bg-dark-800/60 p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-300 uppercase">
          <IoSparklesOutline className="w-4 h-4 text-primary" />
          Intent Deck
        </div>
        <div className="flex gap-2">
          {(['send', 'swap', 'approve'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setIntent(value)}
              className={`flex-1 rounded-lg border py-1.5 text-[10px] font-bold uppercase transition-colors ${
                intent === value ? 'border-primary/50 bg-primary/15 text-orange-200' : 'border-dark-600 bg-dark-700/40 text-gray-400'
              }`}
            >
              {value}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-gray-400">
          Active intent: <span className="font-bold text-gray-200 uppercase">{intent}</span> with <span className="font-bold text-gray-200 uppercase">{gasLane}</span> lane.
        </p>
      </section>
    </div>
  )
}

export default EvmModelPage
