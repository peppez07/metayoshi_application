import React, { useMemo, useState } from 'react'
import { IoCubeOutline, IoFunnelOutline, IoGitCompareOutline } from 'react-icons/io5'
import { useWalletStore } from '../../../store/walletStore'

const ASSET_ROWS: Array<{ symbol: string; amount: string }> = [
  { symbol: 'YOSHI', amount: '482.10' },
  { symbol: 'RTM-LP', amount: '51.44' },
  { symbol: 'META', amount: '2200.00' },
  { symbol: 'GEM', amount: '97.75' },
  { symbol: 'NODE', amount: '13.02' }
]

const UtxoAssetsModelPage: React.FC = () => {
  const { accounts, activeAccountId, activeNetworkId } = useWalletStore()
  const [query, setQuery] = useState('')
  const [composer, setComposer] = useState<'single' | 'batch'>('single')
  const activeAccount = accounts.find((a) => a.id === activeAccountId) || accounts[0]

  const filteredAssets = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ASSET_ROWS
    return ASSET_ROWS.filter((a) => a.symbol.toLowerCase().includes(q))
  }, [query])

  const address = activeAccount?.networkAddresses?.[activeNetworkId] || ''

  return (
    <div className="h-full overflow-y-auto custom-scrollbar px-4 py-4 space-y-4">
      <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-dark-700/90 to-dark-900 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">UTXO Asset Studio</p>
        <p className="text-[11px] text-gray-400 mt-2">Coin + asset orchestration page for RTM-like multi-layer chains.</p>
      </section>

      <section className="rounded-xl border border-dark-600 bg-dark-800/60 p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase text-gray-300">
          <IoFunnelOutline className="w-4 h-4 text-primary" />
          Asset Filter
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter asset symbols..."
          className="w-full bg-dark-700/60 border border-dark-600 rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary"
        />
        <div className="grid grid-cols-2 gap-2">
          {filteredAssets.map((asset) => (
            <div key={asset.symbol} className="rounded-lg border border-dark-600 bg-dark-700/40 p-2">
              <div className="flex items-center gap-1 text-[10px] text-gray-400">
                <IoCubeOutline className="w-3 h-3" />
                {asset.symbol}
              </div>
              <p className="text-sm font-bold text-gray-200">{asset.amount}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-dark-600 bg-dark-800/60 p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase text-gray-300">
          <IoGitCompareOutline className="w-4 h-4 text-primary" />
          Transfer Composer
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(['single', 'batch'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setComposer(mode)}
              className={`rounded-lg border py-1.5 text-[10px] font-bold uppercase ${
                composer === mode ? 'border-primary/50 bg-primary/15 text-orange-200' : 'border-dark-600 bg-dark-700/40 text-gray-400'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-gray-400">Composer mode: {composer}</p>
      </section>

      <div className="rounded-lg border border-dark-600 bg-dark-800/40 p-2 text-[10px] font-mono text-gray-500 break-all">
        {address || 'No active address'}
      </div>
    </div>
  )
}

export default UtxoAssetsModelPage
