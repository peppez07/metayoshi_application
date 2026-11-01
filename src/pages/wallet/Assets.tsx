import React from 'react'
import { Navigate } from 'react-router-dom'
import { AssetList } from '../../components/AssetList'
import { networkParams, useWalletStore } from '../../store/walletStore'

const Assets: React.FC = () => {
  const hasAssets = useWalletStore((state) => networkParams(state).hasAssets)
  if (!hasAssets) return <Navigate to="/wallet/activity" replace />
  return (
    <div className="h-full overflow-y-auto custom-scrollbar px-2 pb-4">
      <AssetList />
    </div>
  )
}

export default Assets
