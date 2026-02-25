import { useCallback, useEffect, useState } from 'react'
import { useWalletStore, type ChainModelLiveSnapshot } from '../../../store/walletStore'

export function useChainModelLiveData() {
  const { activeNetworkId, activeAccountId, probeActiveChainModel } = useWalletStore()
  const [snapshot, setSnapshot] = useState<ChainModelLiveSnapshot | null>(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const next = await probeActiveChainModel()
      setSnapshot(next)
    } finally {
      setLoading(false)
    }
  }, [probeActiveChainModel])

  useEffect(() => {
    void refresh()
    const t = window.setInterval(() => void refresh(), 20_000)
    return () => window.clearInterval(t)
  }, [refresh, activeNetworkId, activeAccountId])

  return { snapshot, loading, refresh }
}
