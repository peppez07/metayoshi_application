import { useEffect, useState } from 'react'
import { readCatalogModelSummary, type CatalogModelSummary } from './repository'

const EMPTY_SUMMARY: CatalogModelSummary = {
  modelId: '',
  mainCount: 0,
  assetCount: 0,
  assetRows: []
}

export function useCatalogModelSummary(modelId: string, refreshToken?: number): CatalogModelSummary {
  const [summary, setSummary] = useState<CatalogModelSummary>(EMPTY_SUMMARY)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const next = await readCatalogModelSummary(modelId)
      if (!cancelled) setSummary(next)
    })()

    return () => { cancelled = true }
  }, [modelId, refreshToken])

  return summary
}
