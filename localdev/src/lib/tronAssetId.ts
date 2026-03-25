const TRON_BASE58_ADDRESS_RE = /^T[1-9A-HJ-NP-Za-km-z]{33}$/
const TRON_HEX_ADDRESS_RE = /^41[a-fA-F0-9]{40}$/

export function isLikelyTronContractAddress(value: string): boolean {
  const raw = String(value || '').trim()
  return TRON_BASE58_ADDRESS_RE.test(raw) || TRON_HEX_ADDRESS_RE.test(raw)
}

export function buildTronAssetId(contract: string): string {
  const normalized = String(contract || '').trim()
  return isLikelyTronContractAddress(normalized) ? `trc20:${normalized}` : ''
}

export function extractTronContractFromAssetId(assetId: string): string {
  const raw = String(assetId || '').trim()
  if (!raw) return ''
  const tagged = raw.match(/^trc20:([^:\s]+)$/i)
  const candidate = String(tagged?.[1] || raw).trim()
  return isLikelyTronContractAddress(candidate) ? candidate : ''
}

export function encodeTronContractLogoHint(logo: string, contract: string): string {
  const base = String(logo || '').trim()
  const normalizedContract = String(contract || '').trim()
  if (!base || !normalizedContract) return base || ''
  return `${base}#tron-contract=${encodeURIComponent(normalizedContract)}`
}

export function extractTronContractFromLogoUri(value: string): string {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const idx = raw.indexOf('#tron-contract=')
  if (idx < 0) return ''
  try {
    return decodeURIComponent(raw.slice(idx + '#tron-contract='.length)).trim()
  } catch {
    return raw.slice(idx + '#tron-contract='.length).trim()
  }
}
