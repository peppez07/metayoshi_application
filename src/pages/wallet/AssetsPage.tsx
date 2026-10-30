import React, { useState } from 'react'
import { IoRefresh, IoSearchOutline } from 'react-icons/io5'
import { AssetList } from '../../components/AssetList'
import { IconButton, PageHeader } from '../../components/ui'
import { Input } from '../../components/Input'
import { useWalletStore } from '../../store/walletStore'

const AssetsPage: React.FC = () => {
  const { refresh, refreshing } = useWalletStore()
  const [query, setQuery] = useState('')

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Assets"
        back="/wallet/assets"
        action={
          <IconButton label="Refresh" onClick={() => void refresh()}>
            <IoRefresh className={`w-[18px] h-[18px] ${refreshing ? 'animate-spin-smooth' : ''}`} />
          </IconButton>
        }
      />
      <div className="px-4 pt-3 pb-2">
        <Input
          aria-label="Search assets"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or asset ID"
          trailing={<IoSearchOutline className="w-4 h-4 text-gray-500" />}
        />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 pb-4">
        <AssetList query={query} />
      </div>
    </div>
  )
}

export default AssetsPage
