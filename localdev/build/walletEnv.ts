import path from 'path'
import { existsSync, readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { getSafeChainConfigurations, getSafeServiceConfiguration } from '../src/lib/safeConfig'

const API_HOST_ALIASES = ['api', 'auth', 'balance', 'send', 'swap', 'www', 'web', 'tokens'] as const

const walletRootDir = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)))

function stripInlineComment(value: string): string {
  let out = ''
  let quote: '"' | "'" | null = null
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i]
    if (ch === '"' || ch === "'") {
      if (!quote) quote = ch
      else if (quote === ch) quote = null
      out += ch
      continue
    }
    if (ch === '#' && !quote) break
    out += ch
  }
  return out.trim()
}

function unquote(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

export function parseBooleanLike(value: unknown, fallback: boolean): boolean {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized) return fallback
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return fallback
}

export function parseEnvFile(filePath: string): Record<string, string> {
  const out: Record<string, string> = {}
  if (!existsSync(filePath)) return out

  const raw = readFileSync(filePath, 'utf-8')
  const lines = raw.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const equalsPos = trimmed.indexOf('=')
    if (equalsPos <= 0) continue

    const key = trimmed.slice(0, equalsPos).trim()
    const rawValue = trimmed.slice(equalsPos + 1)
    const value = unquote(stripInlineComment(rawValue))
    if (!key) continue
    out[key] = value
  }

  return out
}

export function loadLocalWalletEnvFiles(baseDir = walletRootDir): Record<string, string> {
  const files = [
    path.resolve(baseDir, '.env'),
    path.resolve(baseDir, '.env.local')
  ]
  const out: Record<string, string> = {}
  for (const file of files) {
    const parsed = parseEnvFile(file)
    for (const [key, value] of Object.entries(parsed)) out[key] = value
  }
  return out
}

function isLocalHttpOrigin(value: unknown): boolean {
  const raw = String(value ?? '').trim()
  if (!raw || !/^https?:\/\//i.test(raw)) return false
  try {
    const parsed = new URL(raw)
    const host = String(parsed.hostname || '').trim().toLowerCase()
    if (!host) return false
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return true
    return false
  } catch {
    return false
  }
}

function isLocalHostname(hostname: string): boolean {
  const host = String(hostname || '').trim().toLowerCase()
  if (!host) return true
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return true
  return false
}

function isPlaceholderHostname(hostname: string): boolean {
  const host = String(hostname || '').trim().toLowerCase()
  if (!host) return true
  if (host === 'yourdomain.com' || host.endsWith('.yourdomain.com')) return true
  if (host === 'example.com' || host.endsWith('.example.com')) return true
  if (host === 'example.org' || host.endsWith('.example.org')) return true
  if (host === 'example.net' || host.endsWith('.example.net')) return true
  return false
}

function normalizeConfiguredApiBaseForValidation(value: unknown, allowLocalBackend: boolean): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  if (!/^https?:\/\//i.test(raw)) return ''
  try {
    const parsed = new URL(raw)
    if (isPlaceholderHostname(parsed.hostname)) return ''
    if (isLocalHostname(parsed.hostname) && !allowLocalBackend) return ''
    return parsed.origin.replace(/\/+$/, '')
  } catch {
    return ''
  }
}

function toCanonicalApiOriginForValidation(value: unknown, allowLocalBackend: boolean): string {
  const normalized = normalizeConfiguredApiBaseForValidation(value, allowLocalBackend)
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

export function validateWalletEnvConfiguration(baseDir = walletRootDir): void {
  const localWalletEnv = loadLocalWalletEnvFiles(baseDir)
  const env: Record<string, string> = { ...localWalletEnv }
  const relevantProcessKeys = [
    'VITE_API_BASE_URL',
    'VITE_AUTH_API_BASE_URL',
    'VITE_BALANCE_API_BASE_URL',
    'VITE_SEND_API_BASE_URL',
    'VITE_SWAP_API_BASE_URL',
    'VITE_SECURE_BRIDGE_API_BASE_URL',
    'VITE_DEFAULT_NETWORK',
    'VITE_ENABLED_COINS',
    'VITE_DISABLED_COINS',
    'VITE_ENABLE_LOCAL_BACKEND_HELP',
    'VITE_BRIDGE_AUTOCONFIG_FROM_SERVER_ENV',
    'VITE_BRIDGE_AUTOCONFIG_INCLUDE_SECRETS',
    'VITE_BRIDGE_USER',
    'VITE_BRIDGE_PASSWORD',
    'VITE_APP_API_KEY',
    'VITE_BRIDGE_TX_AUTH_KEY',
    'VITE_SAFE_SERVICE_BASE_URL',
    ...getSafeChainConfigurations().map((config) => config.envKey)
  ] as const
  for (const key of relevantProcessKeys) {
    const value = String(process.env[key] ?? '').trim()
    if (value) env[key] = value
  }

  const allowLocalBackend = parseBooleanLike(env.VITE_ENABLE_LOCAL_BACKEND_HELP, false)
  const autoConfigEnabled = parseBooleanLike(
    env.VITE_BRIDGE_AUTOCONFIG_FROM_SERVER_ENV ?? env.BRIDGE_AUTOCONFIG_FROM_SERVER_ENV,
    false
  )
  const autoConfigIncludeSecrets = parseBooleanLike(
    env.VITE_BRIDGE_AUTOCONFIG_INCLUDE_SECRETS ?? env.BRIDGE_AUTOCONFIG_INCLUDE_SECRETS,
    false
  )

  const errors: string[] = []
  const warnings: string[] = []
  const apiEnvKeys = [
    'VITE_API_BASE_URL',
    'VITE_AUTH_API_BASE_URL',
    'VITE_BALANCE_API_BASE_URL',
    'VITE_SEND_API_BASE_URL',
    'VITE_SWAP_API_BASE_URL',
    'VITE_SECURE_BRIDGE_API_BASE_URL'
  ] as const

  if (autoConfigIncludeSecrets && !autoConfigEnabled) {
    warnings.push(
      'VITE_BRIDGE_AUTOCONFIG_INCLUDE_SECRETS=true has no effect unless VITE_BRIDGE_AUTOCONFIG_FROM_SERVER_ENV=true is also set.'
    )
  }

  const bridgeUser = String(env.VITE_BRIDGE_USER || '').trim()
  const bridgePassword = String(env.VITE_BRIDGE_PASSWORD || '').trim()
  if ((bridgeUser && !bridgePassword) || (!bridgeUser && bridgePassword)) {
    errors.push(
      'Bridge credentials are partially configured. Set both VITE_BRIDGE_USER and VITE_BRIDGE_PASSWORD, or leave both unset.'
    )
  }

  let canonicalApiOrigin = ''
  for (const key of apiEnvKeys) {
    const raw = String(env[key] || '').trim()
    if (!raw) continue

    if (isLocalHttpOrigin(raw) && !allowLocalBackend) {
      errors.push(`${key} points to a local origin (${raw}) but VITE_ENABLE_LOCAL_BACKEND_HELP is not enabled.`)
      continue
    }

    const normalized = normalizeConfiguredApiBaseForValidation(raw, allowLocalBackend)
    if (!normalized) {
      errors.push(`${key} is not a usable HTTP(S) API origin: ${raw}`)
      continue
    }

    const canonical = toCanonicalApiOriginForValidation(raw, allowLocalBackend)
    if (!canonicalApiOrigin) canonicalApiOrigin = canonical

    if (canonicalApiOrigin && canonical && canonical !== canonicalApiOrigin) {
      errors.push(
        `${key} resolves to ${canonical}, which conflicts with the canonical wallet backend origin ${canonicalApiOrigin}.`
      )
    }

    if (!isLocalHttpOrigin(raw) && raw.replace(/\/+$/, '') !== canonical) {
      warnings.push(
        `${key} uses a legacy or non-canonical host (${raw}). The wallet normalizes service hosts to ${canonical}; prefer setting all service bases to the same API origin.`
      )
    }
  }

  const disabledCoins = new Set(
    String(env.VITE_DISABLED_COINS || '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  )
  const enabledCoins = new Set(
    String(env.VITE_ENABLED_COINS || '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  )
  const configuredDefaultNetwork = String(env.VITE_DEFAULT_NETWORK || '').trim().toLowerCase()
  if (configuredDefaultNetwork && disabledCoins.has(configuredDefaultNetwork)) {
    errors.push(
      `VITE_DEFAULT_NETWORK=${configuredDefaultNetwork} is also listed in VITE_DISABLED_COINS. Choose a startup network that remains enabled.`
    )
  }

  const isSafeChainEnabled = (aliases: readonly string[]): boolean => {
    const normalizedAliases = aliases.map((value) => String(value || '').trim().toLowerCase()).filter(Boolean)
    if (normalizedAliases.length === 0) return false
    if (enabledCoins.size > 0) return normalizedAliases.some((alias) => enabledCoins.has(alias))
    return !normalizedAliases.some((alias) => disabledCoins.has(alias))
  }

  for (const safeChain of getSafeChainConfigurations()) {
    if (!isSafeChainEnabled(safeChain.networkAliases)) continue
    const service = getSafeServiceConfiguration(safeChain.chainId, env)
    if (service.serviceUrl) continue
    errors.push(
      `Safe multisig is enabled for ${safeChain.label} (${safeChain.chainId}) but no Safe service endpoint is configured. ` +
      `Set ${safeChain.envKey} or VITE_SAFE_SERVICE_BASE_URL, or disable one of: ${safeChain.networkAliases.join(', ')}.`
    )
  }

  for (const warning of warnings) {
    console.warn(`[metayoshi] Config warning: ${warning}`)
  }
  if (errors.length > 0) {
    throw new Error(
      ['Wallet environment validation failed:', ...errors.map((message) => `- ${message}`)].join('\n')
    )
  }
}
