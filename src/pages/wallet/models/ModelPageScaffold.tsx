import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../../components/Button'
import type { CoinModelFamily } from '../../../lib/coinModel'
import { CoinModelCard } from './CoinModelPanel'

interface ModelPageScaffoldProps {
  model: CoinModelFamily
}

export const ModelPageScaffold: React.FC<ModelPageScaffoldProps> = ({ model }) => {
  const navigate = useNavigate()
  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="px-5 py-4 space-y-4">
        <CoinModelCard model={model} />
        <div className="rounded-xl border border-dark-600 bg-dark-800/60 p-3">
          <p className="text-xs text-gray-300 leading-relaxed">
            Dedicated model route. This is the base for chain-specific UX and flows.
          </p>
        </div>
        <Button className="w-full btn-secondary" onClick={() => navigate('/wallet/activity')}>
          Back To Wallet
        </Button>
      </div>
    </div>
  )
}
