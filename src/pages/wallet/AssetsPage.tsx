import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IoArrowBack, IoRefresh, IoSearchOutline } from 'react-icons/io5'
import { AssetList } from '../../components/AssetList'
import { useWalletStore } from '../../store/walletStore'

const AssetsPage: React.FC = () => {
  const navigate = useNavigate()
  const { refresh, refreshing } = useWalletStore()
  const [query, setQuery] = useState('')

  return (
    <div className="flex flex-col h-full bg-dark-800">
      <header className="p-4 flex items-center justify-between border-b border-dark-600">
        <button onClick={() => navigate('/wallet/assets')} className="p-1 rounded-lg hover:bg-dark-700">
          <IoArrowBack className="w-5 h-5" />
        </button>
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">RTM Assets</span>
        <button onClick={() => void refresh()} className="p-1 rounded-lg hover:bg-dark-700" title="Refresh">
          <IoRefresh className={`w-5 h-5 ${refreshing ? 'animate-spin-smooth' : ''}`} />
        </button>
      </header>
      <div className="p-4 pb-2">
        <div className="relative">
          <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or asset ID…"
            className="w-full bg-dark-700/60 border border-dark-600 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 pb-4">
        <AssetList query={query} />
      </div>
    </div>
  )
}

export default AssetsPage
