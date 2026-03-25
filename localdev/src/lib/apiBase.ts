export const DEFAULT_PUBLIC_API_BASE_URL = 'https://api.metayoshi.app'
const API_HOST_ALIASES = ['api', 'auth', 'balance', 'send', 'swap', 'www', 'web', 'tokens'] as const

function isLocalApiBaseEnabled(): boolean {
  return String((import.meta as any)?.env?.VITE_ENABLE_LOCAL_BACKEND_HELP || '').trim().toLowerCase() === 'true'
}

function isLocalHostname(hostname: string): boolean {
  const host = String(hostname || '').trim().toLowerCase()
  if (!host) return true
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return true
  return false
}

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
    if (isLocalHostname(parsed.hostname) && !isLocalApiBaseEnabled()) return ''
    return raw.replace(/\/+$/, '')
  } catch {
    return ''
  }
}

function toCanonicalApiOrigin(baseUrl: string): string {
  const normalized = normalizeConfiguredApiBaseUrl(baseUrl)
  if (!normalized) return ''
  try {
    const parsed = new URL(normalized)
    if (isLocalHostname(parsed.hostname)) return parsed.origin
    const host = String(parsed.hostname || '').trim().toLowerCase()
    if (host === 'metayoshi.app' || host === 'metayoshi.com') {
      parsed.hostname = `api.${host}`
      return parsed.origin
    }
    const parts = parsed.hostname.split('.').filter(Boolean)
    if (parts.length < 2) return parsed.origin
    if (!API_HOST_ALIASES.includes(parts[0] as (typeof API_HOST_ALIASES)[number])) return parsed.origin
    parts[0] = 'api'
    parsed.hostname = parts.join('.')
    return parsed.origin
  } catch {
    return normalized
  }
}

function resolveCanonicalApiBase(value?: unknown): string {
  const env = (import.meta as any)?.env || {}
  const candidates = [
    value,
    env.VITE_API_BASE_URL,
    env.VITE_SECURE_BRIDGE_API_BASE_URL,
    env.VITE_AUTH_API_BASE_URL,
    env.VITE_BALANCE_API_BASE_URL,
    env.VITE_SEND_API_BASE_URL,
    env.VITE_SWAP_API_BASE_URL
  ]
  for (const candidate of candidates) {
    const normalized = toCanonicalApiOrigin(String(candidate ?? ''))
    if (normalized) return normalized
  }
  return ''
}

function resolveServiceApiBaseUrl(fallbackBase?: unknown): string {
  return resolveCanonicalApiBase(fallbackBase) || DEFAULT_PUBLIC_API_BASE_URL
}

export function resolvePublicApiBaseUrl(value: unknown): string {
  return resolveServiceApiBaseUrl(value)
}

export function resolveAuthApiBaseUrl(value?: unknown): string {
  return resolveServiceApiBaseUrl(value)
}

export function resolveBalanceApiBaseUrl(value?: unknown): string {
  return resolveServiceApiBaseUrl(value)
}

export function resolveSendApiBaseUrl(value?: unknown): string {
  return resolveServiceApiBaseUrl(value)
}

export function resolveSwapApiBaseUrl(value?: unknown): string {
  return resolveServiceApiBaseUrl(value)
}
