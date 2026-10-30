import React from 'react'
import { AssetList } from '../../components/AssetList'

const Assets: React.FC = () => (
  <div className="h-full overflow-y-auto custom-scrollbar px-2 pb-4">
    <AssetList />
  </div>
)

export default Assets
