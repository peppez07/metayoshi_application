import { useCallback, useEffect, useRef, useState } from 'react'
import { useWalletStore, type ChainModelLiveSnapshot } from '../../../store/walletStore'

export function useChainModelLiveData() {
  const { activeNetworkId, activeAccountId, probeActiveChainModel } = useWalletStore()
  const [snapshot, setSnapshot] = useState<ChainModelLiveSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const inFlightRef = useRef(false)

  const refresh = useCallback(async () => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    setLoading(true)
    try {
      const next = await probeActiveChainModel()
      setSnapshot(next)
    } finally {
      inFlightRef.current = false
      setLoading(false)
    }
  }, [probeActiveChainModel])

  useEffect(() => {
    void refresh()
    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return
      void refresh()
    }
    const t = window.setInterval(tick, 30_000)
    return () => window.clearInterval(t)
  }, [refresh, activeNetworkId, activeAccountId])

  return { snapshot, loading, refresh }
}
