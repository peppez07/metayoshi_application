import { normalizeActivityNetworkId } from './txExplorer'

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/

export function buildNativeActivityAssetId(networkId: string): string {
  const normalizedNetworkId = normalizeActivityNetworkId(networkId).trim()
  return normalizedNetworkId ? `native:${normalizedNetworkId.toLowerCase()}` : ''
}

export function normalizeActivityAssetId(assetId: string, networkId?: string): string {
  const raw = String(assetId || '').trim()
  if (!raw) return ''

  if (/^native:/i.test(raw)) {
    const scopedNetworkId = raw.slice('native:'.length).trim() || String(networkId || '').trim()
    return buildNativeActivityAssetId(scopedNetworkId)
  }

  if (EVM_ADDRESS_RE.test(raw)) return raw.toLowerCase()
  return raw
}

export function resolveActivityAssetFilterKey(
  activity: {
    asset?: string
    assetId?: string
    networkId?: string
  },
  networkSymbol?: string
): string {
  const assetId = normalizeActivityAssetId(String(activity.assetId || '').trim(), activity.networkId)
  if (assetId) return assetId

  const assetLabel = String(activity.asset || '').trim()
  const symbol = String(networkSymbol || '').trim()
  if (assetLabel && symbol && assetLabel.toUpperCase() === symbol.toUpperCase()) {
    return buildNativeActivityAssetId(String(activity.networkId || '').trim())
  }
  return ''
}
