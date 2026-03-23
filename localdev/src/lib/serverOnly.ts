import type { Network } from '../coins/types'

function normalizeHostname(value: string): string {
  return String(value || '').trim().toLowerCase()
}

export function isMetayoshiHostname(hostname: string): boolean {
  const normalized = normalizeHostname(hostname)
  return normalized === 'metayoshi.app' || normalized.endsWith('.metayoshi.app')
}

export function isMetayoshiHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(String(value || '').trim())
    if (!/^https?:$/i.test(parsed.protocol)) return false
    return isMetayoshiHostname(parsed.hostname)
  } catch {
    return false
  }
}

function isPlaceholderHost(hostname: string): boolean {
  const normalized = normalizeHostname(hostname)
  return normalized === 'yourdomain.com'
    || normalized.endsWith('.yourdomain.com')
    || normalized === 'example.com'
    || normalized.endsWith('.example.com')
    || normalized === 'example.org'
    || normalized.endsWith('.example.org')
    || normalized === 'example.net'
    || normalized.endsWith('.example.net')
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(String(value || '').trim())
    if (!/^https?:$/i.test(parsed.protocol)) return false
    return !isPlaceholderHost(parsed.hostname)
  } catch {
    return false
  }
}

export function sanitizeServerHttpUrl(value: string, fallback = ''): string {
  const raw = String(value || '').trim()
  if (raw && isMetayoshiHttpUrl(raw)) return raw
  return String(fallback || '').trim()
}

export function sanitizeExplorerUrl(value: string): string {
  return sanitizeServerHttpUrl(value, '')
}

export function sanitizeRpcUrl(value: string, apiBaseUrl: string): string {
  const raw = String(value || '').trim()
  if (raw && isValidHttpUrl(raw)) return raw
  return String(apiBaseUrl || '').trim()
}

export function sanitizeBridgeUrl(value: string, apiBaseUrl: string): string {
  return sanitizeServerHttpUrl(value, apiBaseUrl)
}

export function sanitizeNetworkServerOnly(network: Network, apiBaseUrl: string): Network {
  return {
    ...network,
    rpcUrl: sanitizeRpcUrl(String(network.rpcUrl || '').trim(), apiBaseUrl),
    bridgeUrl: sanitizeBridgeUrl(String(network.bridgeUrl || '').trim(), apiBaseUrl) || undefined,
    explorerUrl: sanitizeExplorerUrl(String(network.explorerUrl || '').trim()) || undefined
  }
}
