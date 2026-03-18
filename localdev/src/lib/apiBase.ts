export const DEFAULT_PUBLIC_API_BASE_URL = 'https://api.metayoshi.app'
type WalletApiService = 'api' | 'balance' | 'send' | 'swap'

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
    return raw.replace(/\/+$/, '')
  } catch {
    return ''
  }
}

function replaceServiceHost(baseUrl: string, service: WalletApiService): string {
  const normalized = normalizeConfiguredApiBaseUrl(baseUrl)
  if (!normalized) return ''
  try {
    const parsed = new URL(normalized)
    if (isLocalHostname(parsed.hostname)) return parsed.origin
    const parts = parsed.hostname.split('.').filter(Boolean)
    if (parts.length < 2) return parsed.origin
    if (['api', 'balance', 'send', 'swap', 'www'].includes(parts[0])) {
      parts[0] = service
    } else {
      parts.unshift(service)
    }
    parsed.hostname = parts.join('.')
    return parsed.origin
  } catch {
    return normalized
  }
}

function resolveServiceEnvBase(service: WalletApiService): string {
  const env = (import.meta as any)?.env || {}
  const candidates = (() => {
    switch (service) {
      case 'api':
        return [env.VITE_AUTH_API_BASE_URL, env.VITE_SECURE_BRIDGE_API_BASE_URL, env.VITE_API_BASE_URL]
      case 'balance':
        return [env.VITE_BALANCE_API_BASE_URL]
      case 'send':
        return [env.VITE_SEND_API_BASE_URL, env.VITE_SECURE_BRIDGE_API_BASE_URL]
      case 'swap':
        return [env.VITE_SWAP_API_BASE_URL, env.VITE_SECURE_BRIDGE_API_BASE_URL]
      default:
        return []
    }
  })()
  for (const candidate of candidates) {
    const normalized = normalizeConfiguredApiBaseUrl(candidate)
    if (normalized) return normalized
  }
  return ''
}

function resolveServiceApiBaseUrl(service: WalletApiService, fallbackBase?: unknown): string {
  const explicit = resolveServiceEnvBase(service)
  if (explicit) return explicit
  const normalizedFallback = normalizeConfiguredApiBaseUrl(fallbackBase)
  if (normalizedFallback) return replaceServiceHost(normalizedFallback, service)
  return replaceServiceHost(DEFAULT_PUBLIC_API_BASE_URL, service)
}

export function resolvePublicApiBaseUrl(value: unknown): string {
  return resolveServiceApiBaseUrl('api', value)
}

export function resolveAuthApiBaseUrl(value?: unknown): string {
  return resolveServiceApiBaseUrl('api', value)
}

export function resolveBalanceApiBaseUrl(value?: unknown): string {
  return resolveServiceApiBaseUrl('balance', value)
}

export function resolveSendApiBaseUrl(value?: unknown): string {
  return resolveServiceApiBaseUrl('send', value)
}

export function resolveSwapApiBaseUrl(value?: unknown): string {
  return resolveServiceApiBaseUrl('swap', value)
}
