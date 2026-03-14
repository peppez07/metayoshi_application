export const DEFAULT_PUBLIC_API_BASE_URL = 'https://api.metayoshi.app'

function isPlaceholderHost(hostname: string): boolean {
  const host = String(hostname || '').trim().toLowerCase()
  if (!host) return true
  if (host === 'yourdomain.com' || host.endsWith('.yourdomain.com')) return true
  if (host === 'example.com' || host.endsWith('.example.com')) return true
  if (host === 'example.org' || host.endsWith('.example.org')) return true
  if (host === 'example.net' || host.endsWith('.example.net')) return true
  return false
}

export function normalizeConfiguredApiBaseUrl(value: unknown): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  if (!/^https?:\/\//i.test(raw)) return ''

  try {
    const parsed = new URL(raw)
    if (isPlaceholderHost(parsed.hostname)) return ''
    return raw.replace(/\/+$/, '')
  } catch {
    return ''
  }
}

export function resolvePublicApiBaseUrl(value: unknown): string {
  return normalizeConfiguredApiBaseUrl(value) || DEFAULT_PUBLIC_API_BASE_URL
}
