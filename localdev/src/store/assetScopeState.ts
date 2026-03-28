export type AssetSnapshotLike = {
  assets?: Record<string, unknown> | null
  logos?: Record<string, unknown> | null
  labels?: Record<string, unknown> | null
  evmNfts?: Record<string, unknown> | null
}

export type ScopedAssetSnapshotStatus = {
  emptyAuthoritative: boolean
  updatedAt: number
  source?: string | null
}

function hasEntries(record: Record<string, unknown> | null | undefined): boolean {
  if (!record) return false
  return Object.keys(record).length > 0
}

export function isAssetSnapshotEmpty(snapshot: AssetSnapshotLike): boolean {
  return (
    !hasEntries(snapshot.assets)
    && !hasEntries(snapshot.logos)
    && !hasEntries(snapshot.labels)
    && !hasEntries(snapshot.evmNfts)
  )
}

export function buildScopedAssetSnapshotStatus(input: {
  snapshot: AssetSnapshotLike
  emptyAuthoritative?: boolean
  updatedAt?: number
  source?: string
}): ScopedAssetSnapshotStatus {
  const empty = isAssetSnapshotEmpty(input.snapshot)
  const updatedAt = Number(input.updatedAt)
  const source = String(input.source || '').trim()

  return {
    emptyAuthoritative: empty && input.emptyAuthoritative === true,
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
    source: source || null
  }
}

export function shouldPreferNetworkAssetSnapshot(input: {
  scopedPresent: boolean
  scoped: AssetSnapshotLike
  network: AssetSnapshotLike
  status?: ScopedAssetSnapshotStatus | null
}): boolean {
  if (!input.scopedPresent) return false
  if (!isAssetSnapshotEmpty(input.scoped)) return false
  if (input.status?.emptyAuthoritative === true) return false
  return !isAssetSnapshotEmpty(input.network)
}

export function shouldRetainActiveNetworkProjection(input: {
  currentNetwork: AssetSnapshotLike
  nextScoped: AssetSnapshotLike
  status?: ScopedAssetSnapshotStatus | null
}): boolean {
  if (input.status?.emptyAuthoritative === true) return false
  if (!isAssetSnapshotEmpty(input.nextScoped)) return false
  return !isAssetSnapshotEmpty(input.currentNetwork)
}
