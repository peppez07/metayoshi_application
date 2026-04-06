import type { Network } from '../coins/types'
import { DEFAULT_PUBLIC_API_BASE_URL, normalizeConfiguredApiBaseUrl } from './apiBase'
import { resolveRuntimeModelId } from './runtimeModel'

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

function isLocalHostname(hostname: string): boolean {
  const normalized = normalizeHostname(hostname)
  return normalized === 'localhost'
    || normalized === '127.0.0.1'
    || normalized === '::1'
    || /^\d+\.\d+\.\d+\.\d+$/.test(normalized)
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

function toTrustedOrigin(value: unknown): string {
  const normalized = normalizeConfiguredApiBaseUrl(value)
  if (normalized) {
    try {
      return new URL(normalized).origin
    } catch {
      return ''
    }
  }

  const raw = String(value ?? '').trim()
  if (!raw || !/^https?:\/\//i.test(raw)) return ''
  try {
    const parsed = new URL(raw)
    if (!/^https?:$/i.test(parsed.protocol)) return ''
    if (isPlaceholderHost(parsed.hostname)) return ''
    return parsed.origin
  } catch {
    return ''
  }
}

function resolveTrustedServerOrigins(): Set<string> {
  const env = (import.meta as any)?.env || {}
  const origins = [
    env.VITE_API_BASE_URL,
    env.VITE_AUTH_API_BASE_URL,
    env.VITE_BALANCE_API_BASE_URL,
    env.VITE_SEND_API_BASE_URL,
    env.VITE_SWAP_API_BASE_URL,
    env.VITE_SECURE_BRIDGE_API_BASE_URL,
    DEFAULT_PUBLIC_API_BASE_URL
  ]
    .map(toTrustedOrigin)
    .filter(Boolean)

  return new Set(origins)
}

export function isTrustedServerHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(String(value || '').trim())
    if (!/^https?:$/i.test(parsed.protocol)) return false
    if (isPlaceholderHost(parsed.hostname)) return false
    if (isLocalHostname(parsed.hostname)) return true
    return resolveTrustedServerOrigins().has(parsed.origin)
  } catch {
    return false
  }
}

export function sanitizeServerHttpUrl(value: string, fallback = ''): string {
  const raw = String(value || '').trim()
  if (raw && isTrustedServerHttpUrl(raw)) return raw
  const fallbackValue = String(fallback || '').trim()
  return fallbackValue && isTrustedServerHttpUrl(fallbackValue) ? fallbackValue : ''
}

export function sanitizeExplorerUrl(_value: string): string {
  return ''
}

export function sanitizeRpcUrl(value: string, fallback = ''): string {
  const raw = String(value || '').trim()
  if (raw && isValidHttpUrl(raw)) return raw
  return String(fallback || '').trim()
}

export function sanitizeBridgeUrl(value: string, apiBaseUrl: string): string {
  const raw = String(value || '').trim()
  if (raw && isTrustedServerHttpUrl(raw)) return raw

  const fallback = String(apiBaseUrl || '').trim()
  if (!fallback) return ''
  if (!raw) return sanitizeServerHttpUrl(fallback, '')

  try {
    const rawUrl = new URL(raw)
    const baseUrl = new URL(fallback)
    baseUrl.pathname = rawUrl.pathname
    baseUrl.search = rawUrl.search
    baseUrl.hash = rawUrl.hash
    return sanitizeServerHttpUrl(baseUrl.toString(), fallback)
  } catch {
    return sanitizeServerHttpUrl(fallback, '')
  }
}

export function sanitizeNetworkServerOnly(network: Network, apiBaseUrl: string): Network {
  const modelId = resolveRuntimeModelId(network)
  const sanitizedRpcUrl = (modelId === 'sui' || modelId === 'sol' || modelId === 'tron')
    ? ''
    : sanitizeRpcUrl(String(network.rpcUrl || '').trim())
  return {
    ...network,
    rpcUrl: sanitizedRpcUrl,
    bridgeUrl: sanitizeBridgeUrl(String(network.bridgeUrl || '').trim(), apiBaseUrl) || undefined,
    explorerUrl: sanitizeExplorerUrl(String(network.explorerUrl || '').trim()) || undefined
  }
}
