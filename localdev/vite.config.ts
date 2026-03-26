import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import path from 'path'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string }

type BuildConfig = {
  coins?: { enabled?: 'all' | '*' | string[]; disabled?: string[] }
  features?: Record<string, boolean | undefined>
  modelStatus?: { tested?: string[]; untested?: string[]; blocked?: string[] }
}

type WalletLogoSpec = {
  coinIds: string[]
  file: string
  names: string[]
}

type ManifestShape = {
  background?: {
    scripts?: string[]
    service_worker?: string
    type?: string
  }
  browser_specific_settings?: {
    gecko?: {
      id?: string
      strict_min_version?: string
    }
  }
}

const API_HOST_ALIASES = ['api', 'auth', 'balance', 'send', 'swap', 'www', 'web', 'tokens'] as const

function loadBuildConfig(): BuildConfig {
  const explicit = String(process.env.METAYOSHI_BUILD_CONFIG_PATH || '').trim()
  const defaultPath = path.resolve(__dirname, 'metayoshi.build.json')
  const configPath = explicit ? path.resolve(__dirname, explicit) : defaultPath
  if (!existsSync(configPath)) return {}

  try {
    const raw = readFileSync(configPath, 'utf-8')
    const json = JSON.parse(raw) as any
    if (!json || typeof json !== 'object' || Array.isArray(json)) return {}
    console.log(`[metayoshi] Build config loaded from ${configPath}`)
    return json as BuildConfig
  } catch (err) {
    console.warn(`[metayoshi] Failed to load build config from ${configPath}:`, err)
    return {}
  }
}

const buildConfig = loadBuildConfig()

const VIRTUAL_WALLET_LOGO_REGISTRY_ID = 'virtual:wallet-logo-registry'
const RESOLVED_VIRTUAL_WALLET_LOGO_REGISTRY_ID = `\0${VIRTUAL_WALLET_LOGO_REGISTRY_ID}`

const WALLET_LOGO_SPECS: WalletLogoSpec[] = [
  { coinIds: ['rtm'], file: 'raptoreum.png', names: ['raptoreum', 'rtm'] },
  { coinIds: ['eth'], file: 'ethereum.png', names: ['ethereum', 'eth'] },
  { coinIds: ['ethereum-sepolia'], file: 'ethereum.png', names: ['ethereum-sepolia', 'eth-sepolia', 'sepolia', 'sepolia-eth', 'testnet-ethereum'] },
  { coinIds: ['arb'], file: 'arbitrum.png', names: ['arbitrum', 'arb', 'arbitrum-one'] },
  { coinIds: ['arbitrum-sepolia'], file: 'arbitrum.png', names: ['arbitrum-sepolia', 'arb-sepolia', 'arbitrum-testnet', 'testnet-arbitrum'] },
  { coinIds: ['akash'], file: 'akash-network.png', names: ['akash', 'akash-network', 'akt'] },
  { coinIds: ['aurora'], file: 'aurora.svg', names: ['aurora'] },
  { coinIds: ['bahamut'], file: 'bahamut.svg', names: ['bahamut', 'ftn'] },
  { coinIds: ['op'], file: 'op.png', names: ['op', 'optimism'] },
  { coinIds: ['optimism-sepolia'], file: 'op.png', names: ['optimism-sepolia', 'op-sepolia', 'optimism-testnet', 'testnet-optimism'] },
  { coinIds: ['base'], file: 'base.png', names: ['base', 'base-mainnet', 'base-chain'] },
  { coinIds: ['base-sepolia'], file: 'base.png', names: ['base-sepolia', 'sepolia-base', 'base-testnet', 'testnet-base'] },
  { coinIds: ['bnb', 'bnb-testnet'], file: 'bnb.png', names: ['bnb', 'bsc', 'bnb-smart-chain', 'binance-smart-chain'] },
  { coinIds: ['avaxc'], file: 'avalanche.png', names: ['avalanche', 'avax', 'avaxc', 'avalanche-c-chain'] },
  { coinIds: ['avalanche-fuji'], file: 'avalanche.png', names: ['avalanche-fuji', 'avalanche-fuji-c-chain', 'fuji', 'fuji-c-chain', 'avalanche-testnet'] },
  { coinIds: ['sol'], file: 'solana.png', names: ['solana', 'sol'] },
  { coinIds: ['dash'], file: 'dash.png', names: ['dash'] },
  { coinIds: ['doge'], file: 'dogecoin.png', names: ['dogecoin', 'doge'] },
  { coinIds: ['tron', 'trx'], file: 'tron.png', names: ['tron', 'trx'] },
  { coinIds: ['ada', 'cardano'], file: 'cardano.png', names: ['cardano', 'ada'] },
  { coinIds: ['xlm', 'stellar'], file: 'stellar.png', names: ['stellar', 'xlm'] },
  { coinIds: ['btcz'], file: 'bitcoinz.png', names: ['bitcoinz', 'btcz'] },
  { coinIds: ['firo'], file: 'firo.png', names: ['firo'] },
  { coinIds: ['gnosis'], file: 'gnosis.svg', names: ['gnosis', 'gnosis-chain', 'xdai'] },
  { coinIds: ['cosmos'], file: 'cosmos.png', names: ['cosmos', 'atom'] },
  { coinIds: ['bitcoin'], file: 'bitcoin.png', names: ['bitcoin', 'btc'] },
  { coinIds: ['polygon'], file: 'polygon.png', names: ['polygon', 'matic'] },
  { coinIds: ['polygon-amoy'], file: 'polygon.png', names: ['polygon-amoy', 'polygon-amoy-bor', 'amoy', 'polygon-testnet', 'testnet-polygon'] },
  { coinIds: ['cronos', 'cro'], file: 'cronos.png', names: ['cronos', 'cro', 'cronos-pos'] },
  { coinIds: ['dymension-evm'], file: 'dymension.jpg', names: ['dymension-evm', 'dymension-evm-mainnet', 'mainnet-dymension-evm'] },
  { coinIds: ['elys'], file: 'elysia.png', names: ['elys', 'elys-mainnet', 'mainnet-elys'] },
  { coinIds: ['evmos-evm'], file: 'evmos.png', names: ['evmos-evm', 'evmos-evm-mainnet', 'mainnet-evmos-evm'] },
  { coinIds: ['lumera'], file: 'lumera-health.png', names: ['lumera', 'lumera-mainnet', 'mainnet-lumera'] },
  { coinIds: ['nolus'], file: 'nolus-io.png', names: ['nolus', 'nolus-mainnet', 'mainnet-nolus'] },
  { coinIds: ['oraichain'], file: 'oraichain-token.png', names: ['oraichain', 'oraichain-mainnet', 'mainnet-oraichain', 'orai'] },
  { coinIds: ['sei'], file: 'sei.png', names: ['sei', 'sei-mainnet', 'mainnet-sei'] },
  { coinIds: ['sei-evm'], file: 'sei.png', names: ['sei-evm', 'sei-evm-mainnet', 'mainnet-sei-evm'] },
  { coinIds: ['sui'], file: 'sui.png', names: ['sui'] },
  { coinIds: ['zksync'], file: 'ZKsync.png', names: ['zksync', 'zk-sync', 'zk sync', 'zks', 'zk', 'zk era', 'zksync-era'] }
]

function normalizeCoinId(value: unknown): string {
  return String(value ?? '').trim().toLowerCase()
}

function listWalletLogoFiles(): string[] {
  const logosDir = path.resolve(__dirname, 'src/coins/logos')
  if (!existsSync(logosDir)) return []
  return readdirSync(logosDir)
    .filter((file) => /\.(png|jpg|jpeg|webp|svg)$/i.test(file))
    .sort((a, b) => a.localeCompare(b))
}

function createAutoWalletLogoSpecs(existing: WalletLogoSpec[]): WalletLogoSpec[] {
  const knownFiles = new Set(existing.map((spec) => String(spec.file || '').trim().toLowerCase()).filter(Boolean))
  const out: WalletLogoSpec[] = []
  for (const file of listWalletLogoFiles()) {
    const normalizedFile = file.toLowerCase()
    if (knownFiles.has(normalizedFile)) continue
    const parsed = path.parse(file)
    const baseName = String(parsed.name || '').trim()
    if (!baseName) continue
    out.push({
      coinIds: [baseName],
      file,
      names: [baseName]
    })
  }
  return out
}

function resolveBundledWalletLogoSpecs(config: BuildConfig): WalletLogoSpec[] {
  const disabled = new Set((config.coins?.disabled || []).map(normalizeCoinId).filter(Boolean))
  const specs = [...WALLET_LOGO_SPECS, ...createAutoWalletLogoSpecs(WALLET_LOGO_SPECS)]
  // Network logo assets must stay available even when the visible network set is
  // restricted by build config. The app can still surface runtime/server-backed
  // EVM variants, and missing bundled logos regress to placeholders.
  return specs.filter((spec) => spec.coinIds.some((id) => !disabled.has(normalizeCoinId(id))))
}

function ensureManifestMetadata(manifestPath: string): void {
  if (!existsSync(manifestPath)) return

  const raw = readFileSync(manifestPath, 'utf-8')
  const manifest = JSON.parse(raw) as ManifestShape
  const background = manifest.background || {}

  manifest.background = {
    ...background,
    service_worker: String(background.service_worker || 'background.js').trim() || 'background.js',
    type: background.type || 'module'
  }

  manifest.browser_specific_settings = {
    ...(manifest.browser_specific_settings || {}),
    gecko: {
      ...(manifest.browser_specific_settings?.gecko || {}),
      id: manifest.browser_specific_settings?.gecko?.id || 'wallet@metayoshi.app'
    }
  }

  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8')
}

function manualChunkId(id: string): string | undefined {
  const normalized = id.replace(/\\/g, '/')

  if (!normalized.includes('/node_modules/')) return undefined
  if (normalized.includes('/react/') || normalized.includes('/react-dom/') || normalized.includes('/react-router')) {
    return 'vendor-react'
  }
  if (normalized.includes('/@solana/web3.js/')) {
    return 'vendor-solana'
  }
  if (normalized.includes('/ethers/') || normalized.includes('/@walletconnect/') || normalized.includes('/viem/')) {
    return 'vendor-evm'
  }
  if (normalized.includes('/@mysten/sui/')) {
    return 'vendor-sui'
  }
  if (normalized.includes('/@stellar/stellar-sdk/')) {
    return 'vendor-stellar'
  }
  if (normalized.includes('/@emurgo/cardano-serialization-lib-browser/')) {
    return 'vendor-cardano'
  }
  if (normalized.includes('/@stellar/stellar-sdk/')) {
    return 'vendor-stellar'
  }

  return undefined
}

function createWalletLogoRegistryModule(config: BuildConfig): string {
  const specs = resolveBundledWalletLogoSpecs(config)
  const imports = specs.map((spec, index) => {
    const from = `/src/coins/logos/${spec.file}`
    return `import logo${index} from ${JSON.stringify(from)}`
  })
  const entries = specs.map((spec, index) => {
    return `  { src: logo${index}, names: ${JSON.stringify(spec.names)} }`
  })

  return [
    ...imports,
    '',
    'export const bundledWalletLogos = [',
    ...entries.map((entry, index) => `${entry}${index < entries.length - 1 ? ',' : ''}`),
    ']'
  ].join('\n')
}

function parseBooleanLike(value: unknown, fallback: boolean): boolean {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized) return fallback
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return fallback
}

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

function parseEnvFile(filePath: string): Record<string, string> {
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

function loadLocalWalletEnvFiles(): Record<string, string> {
  const files = [
    path.resolve(__dirname, '.env'),
    path.resolve(__dirname, '.env.local')
  ]
  const out: Record<string, string> = {}
  for (const file of files) {
    const parsed = parseEnvFile(file)
    for (const [key, value] of Object.entries(parsed)) out[key] = value
  }
  return out
}

function setProcessEnvIfMissing(key: string, value: unknown): void {
  const current = String(process.env[key] ?? '').trim()
  if (current) return
  const normalized = String(value ?? '').trim()
  if (!normalized) return
  process.env[key] = normalized
}

function isPlaceholderEnvValue(value: unknown): boolean {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized) return true
  return (
    normalized.includes('change_me')
    || normalized.includes('your-')
    || normalized.includes('your_')
    || normalized.includes('replace-with')
    || normalized === 'your-livecoinwatch-key'
  )
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

function validateWalletEnvConfiguration(): void {
  const localWalletEnv = loadLocalWalletEnvFiles()
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
    'VITE_BRIDGE_TX_AUTH_KEY'
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
  const configuredDefaultNetwork = String(env.VITE_DEFAULT_NETWORK || '').trim().toLowerCase()
  if (configuredDefaultNetwork && disabledCoins.has(configuredDefaultNetwork)) {
    errors.push(
      `VITE_DEFAULT_NETWORK=${configuredDefaultNetwork} is also listed in VITE_DISABLED_COINS. Choose a startup network that remains enabled.`
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

function loadBridgeEnvFromSiblingServerRepo(): void {
  // Local developer convenience:
  // Pull bridge env context from sibling server repos when available.
  // Secrets are imported only when explicitly enabled for local development.
  const localWalletEnv = loadLocalWalletEnvFiles()
  const enabled = parseBooleanLike(
    process.env.BRIDGE_AUTOCONFIG_FROM_SERVER_ENV
      ?? process.env.VITE_BRIDGE_AUTOCONFIG_FROM_SERVER_ENV
      ?? localWalletEnv.BRIDGE_AUTOCONFIG_FROM_SERVER_ENV
      ?? localWalletEnv.VITE_BRIDGE_AUTOCONFIG_FROM_SERVER_ENV,
    false
  )
  if (!enabled) return

  const includeSecrets = parseBooleanLike(
    process.env.BRIDGE_AUTOCONFIG_INCLUDE_SECRETS
      ?? process.env.VITE_BRIDGE_AUTOCONFIG_INCLUDE_SECRETS
      ?? localWalletEnv.BRIDGE_AUTOCONFIG_INCLUDE_SECRETS
      ?? localWalletEnv.VITE_BRIDGE_AUTOCONFIG_INCLUDE_SECRETS,
    false
  )
  const allowLocalBackend = parseBooleanLike(
    process.env.VITE_ENABLE_LOCAL_BACKEND_HELP
      ?? process.env.ENABLE_LOCAL_BACKEND_HELP
      ?? localWalletEnv.VITE_ENABLE_LOCAL_BACKEND_HELP
      ?? localWalletEnv.ENABLE_LOCAL_BACKEND_HELP,
    false
  )

  const siblingServerRoots = [
    path.resolve(__dirname, '../../server_website_metayoshi'),
    path.resolve(__dirname, '../server_website_metayoshi'),
    path.resolve(__dirname, '../../metayoshi_SERVER'),
    path.resolve(__dirname, '../metayoshi_SERVER')
  ]

  const candidateFiles = [
    path.join(siblingServerRoots[0], 'backend_gateway/config/env/windows/vultr/newserver/gateway.env'),
    path.join(siblingServerRoots[0], 'backend_gateway/config/env/windows/local/newserver/gateway.env'),
    path.join(siblingServerRoots[0], 'backend_gateway/tools/linux/newserver.production.env.example'),
    path.join(siblingServerRoots[1], 'backend_gateway/config/env/windows/vultr/newserver/gateway.env'),
    path.join(siblingServerRoots[1], 'backend_gateway/config/env/windows/local/newserver/gateway.env'),
    path.join(siblingServerRoots[1], 'backend_gateway/tools/linux/newserver.production.env.example'),
    path.join(siblingServerRoots[2], '_server_support/windows/local/.env.windows'),
    path.join(siblingServerRoots[2], '_server_support/windows/local/.env.secondary'),
    path.join(siblingServerRoots[2], '_server_support/windows/vultr/.env'),
    path.join(siblingServerRoots[2], '.env'),
    path.join(siblingServerRoots[3], '_server_support/windows/local/.env.windows'),
    path.join(siblingServerRoots[3], '_server_support/windows/local/.env.secondary'),
    path.join(siblingServerRoots[3], '_server_support/windows/vultr/.env'),
    path.join(siblingServerRoots[3], '.env')
  ]

  let selectedFile = ''
  let sourceEnv: Record<string, string> = {}
  for (const file of candidateFiles) {
    if (!existsSync(file)) continue
    const parsed = parseEnvFile(file)
    if (Object.keys(parsed).length === 0) continue
    selectedFile = file
    sourceEnv = parsed
    break
  }
  if (!selectedFile) return

  const secureApiBase = sourceEnv.SECURE_BRIDGE_API_BASE_URL || sourceEnv.API_BASE_URL
  const newServerPort = String(sourceEnv.NEWSERVER_PORT || '').trim()
  const localApiPort = String(sourceEnv.LOCAL_API_PORT || '').trim()
  const localApiBase = /^\d+$/.test(localApiPort) ? `http://127.0.0.1:${localApiPort}` : ''
  const newServerApiBase = /^\d+$/.test(newServerPort) ? `http://127.0.0.1:${newServerPort}` : ''
  const preferredSecureApiBase = (() => {
    const candidate = String(secureApiBase || '').trim()
    if (!candidate) return ''
    if (isLocalHttpOrigin(candidate) && !allowLocalBackend) return ''
    return candidate
  })()
  const resolvedApiBase = String(
    preferredSecureApiBase
    || (allowLocalBackend ? newServerApiBase : '')
    || (allowLocalBackend ? localApiBase : '')
  ).trim()
  setProcessEnvIfMissing('VITE_API_BASE_URL', resolvedApiBase)
  setProcessEnvIfMissing('VITE_SECURE_BRIDGE_API_BASE_URL', resolvedApiBase)

  if (includeSecrets) {
    const bridgeUser = String(sourceEnv.BRIDGE_BASIC_USER || '').trim()
    const bridgePassword = String(sourceEnv.BRIDGE_BASIC_PASSWORD || '').trim()
    if (bridgeUser && bridgePassword && !isPlaceholderEnvValue(bridgeUser) && !isPlaceholderEnvValue(bridgePassword)) {
      setProcessEnvIfMissing('VITE_BRIDGE_USER', bridgeUser)
      setProcessEnvIfMissing('VITE_BRIDGE_PASSWORD', bridgePassword)
    }

    const bridgeTxKey = String(sourceEnv.BRIDGE_TX_AUTH_KEY || '').trim()
    if (bridgeTxKey && !isPlaceholderEnvValue(bridgeTxKey)) {
      setProcessEnvIfMissing('VITE_BRIDGE_TX_AUTH_KEY', bridgeTxKey)
    }

    const appApiKey = String(sourceEnv.APP_API_KEY || '').trim()
    if (appApiKey && !isPlaceholderEnvValue(appApiKey)) {
      setProcessEnvIfMissing('VITE_APP_API_KEY', appApiKey)
    }
  }

  console.log(
    `[metayoshi] Bridge env auto-config loaded from ${selectedFile}` +
    (includeSecrets ? ' (bridge credentials + tx auth + app API key imported)' : ' (secrets skipped)')
  )
}

loadBridgeEnvFromSiblingServerRepo()
validateWalletEnvConfiguration()

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    wasm(),
    topLevelAwait(),
    react(),
    {
      name: 'wallet-logo-registry',
      resolveId(id) {
        if (id === VIRTUAL_WALLET_LOGO_REGISTRY_ID) return RESOLVED_VIRTUAL_WALLET_LOGO_REGISTRY_ID
        return null
      },
      load(id) {
        if (id !== RESOLVED_VIRTUAL_WALLET_LOGO_REGISTRY_ID) return null
        return createWalletLogoRegistryModule(buildConfig)
      }
    },
    {
      name: 'post-build-extension',
      closeBundle() {
        // Ensure dist/assets exists
        const assetsDir = path.resolve(__dirname, 'dist/assets')
        if (!existsSync(assetsDir)) {
          mkdirSync(assetsDir, { recursive: true })
        }

        // Copy manifest.json
        try {
          copyFileSync('public/manifest.json', 'dist/manifest.json')
          ensureManifestMetadata(path.resolve(__dirname, 'dist/manifest.json'))
          console.log('[OK] Copied manifest.json to dist/')
        } catch (err) {
          console.error('Failed to copy manifest.json:', err)
        }

        // Copy MetayoshiLogo.png to dist root (used by logo + favicon)
        try {
          const logoSrc = path.resolve(__dirname, 'public/MetayoshiLogo.png')
          const logoDest = path.resolve(__dirname, 'dist/MetayoshiLogo.png')
          if (existsSync(logoSrc)) {
            copyFileSync(logoSrc, logoDest)
            console.log('Copied MetayoshiLogo.png to dist/')
          } else {
            console.warn('MISSING: public/MetayoshiLogo.png')
          }
        } catch (err) {
          console.error('Failed to copy MetayoshiLogo.png:', err)
        }

        // Copy early runtime process shim as a real asset so CSP stays clean.
        try {
          const shimSrc = path.resolve(__dirname, 'public/process-prelude.js')
          const shimDest = path.resolve(__dirname, 'dist/assets/process-prelude.js')
          if (existsSync(shimSrc)) {
            copyFileSync(shimSrc, shimDest)
            console.log('[OK] Copied process-prelude.js -> dist/assets/process-prelude.js')
          } else {
            console.warn('MISSING: public/process-prelude.js')
          }
        } catch (err) {
          console.error('Failed to copy process-prelude.js:', err)
        }

        // Copy icons from the canonical square logo set used by the wallet source.
        // This avoids store submission failures caused by stale non-square public icons.
        try {
          const sourceIconsDir = path.resolve(__dirname, 'src/coins/logos')
          if (existsSync(sourceIconsDir)) {
            const distIconsDir = path.resolve(__dirname, 'dist/icons')
            if (!existsSync(distIconsDir)) {
              mkdirSync(distIconsDir, { recursive: true })
            }
            const iconMapping: Record<string, string> = {
              'icon-16.png':  'metayoshi-16.png',
              'icon-32.png':  'metayoshi-32.png',
              'icon-48.png':  'metayoshi-48.png',
              'icon-64.png':  'metayoshi-64.png',
              'icon-128.png': 'metayoshi-128.png',
            }
            for (const [src, dest] of Object.entries(iconMapping)) {
              const sourceFileName = dest
              const srcPath  = path.join(sourceIconsDir, sourceFileName)
              const destPath = path.join(assetsDir, dest)
              const legacyDestPath = path.join(distIconsDir, src)
              if (existsSync(srcPath)) {
                copyFileSync(srcPath, destPath)
                console.log(`[OK] Copied ${src} -> dist/assets/${dest}`)
                copyFileSync(srcPath, legacyDestPath)
                console.log(`[OK] Copied ${src} -> dist/icons/${src}`)
              } else {
                console.warn(`[WARN] Missing square icon source: ${sourceFileName}`)
              }
            }
          }
        } catch (err) {
          console.error('Failed to copy icons:', err)
        }

        // Rename bootstrap.css -> ui.css (Vite names CSS after the chunk that imports it)
        try {
          const bootstrapCss = path.resolve(__dirname, 'dist/assets/bootstrap.css')
          const uiCss = path.resolve(__dirname, 'dist/assets/ui.css')
          if (existsSync(bootstrapCss) && !existsSync(uiCss)) {
            copyFileSync(bootstrapCss, uiCss)
            console.log('[OK] Renamed bootstrap.css -> ui.css')
          }
        } catch (err) {
          console.error('Failed to rename CSS:', err)
        }

        // Fix popup HTML: ensure script/link tags use /assets/ui.js and /assets/ui.css
        try {
          const htmlPath = path.resolve(__dirname, 'dist/app/src/ui/index.html')
          if (existsSync(htmlPath)) {
            let html = readFileSync(htmlPath, 'utf-8')

            // Remove the dev-only script tag pointing to /src/main.tsx (Vite injects the real one)
            html = html.replace(/<script[^>]*src="\/src\/main\.tsx"[^>]*><\/script>\n?\s*/g, '')

            // Normalise any auto-generated asset paths -> absolute /assets/...
            html = html.replace(/src="\.+\/assets\//g, 'src="/assets/')
            html = html.replace(/href="\.+\/assets\//g, 'href="/assets/')

            // Fix any bootstrap.css reference -> ui.css
            html = html.replace(/bootstrap\.css/g, 'ui.css')

            // Ensure runtime prelude executes before any module chunk reads process.browser.
            html = html.replace(/<script[^>]*src="\/assets\/process-prelude\.js"[^>]*><\/script>\n?\s*/g, '')

            // Ensure script tag is present
            if (!html.includes('/assets/ui.js')) {
              html = html.replace(
                '</head>',
                '    <script type="module" crossorigin src="/assets/ui.js"></script>\n  </head>',
              )
            }

            html = html.replace(
              '<script type="module" crossorigin src="/assets/ui.js"></script>',
              '    <script src="/assets/process-prelude.js"></script>\n    <script type="module" crossorigin src="/assets/ui.js"></script>'
            )

            // Ensure CSS link tag is present
            if (!html.includes('/assets/ui.css')) {
              html = html.replace(
                '</head>',
                '    <link rel="stylesheet" crossorigin href="/assets/ui.css">\n  </head>',
              )
            }

            writeFileSync(htmlPath, html, 'utf-8')
            console.log('[OK] Fixed popup HTML asset paths')
          } else {
            console.warn('[WARN] dist/app/src/ui/index.html not found after build')
          }
        } catch (err) {
          console.error('Failed to fix popup HTML:', err)
        }

        // Sanity-check critical files
        for (const f of ['dist/background.js', 'dist/assets/ui.js', 'dist/assets/ui.css']) {
          const p = path.resolve(__dirname, f)
          if (existsSync(p)) {
            console.log(`[OK] ${f}`)
          } else {
            console.warn(`[WARN] MISSING: ${f}`)
          }
        }
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Polyfill Node's 'buffer' package for the browser bundle
      buffer: 'buffer',
      // Polyfill Node core modules pulled by crypto helper deps.
      stream: 'stream-browserify',
      events: 'events',
      process: 'process/browser',
    },
  },
  // Make Buffer available as a global so libraries that reference it directly work
  define: {
    global: 'globalThis',
    process: 'globalThis.process',
    'globalThis.Buffer': 'globalThis.Buffer',
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
    __METAYOSHI_BUILD_CONFIG__: JSON.stringify(buildConfig ?? {}),
  },
  optimizeDeps: {
    include: ['buffer', 'stream-browserify', 'events', 'process'],
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        const message = String((warning as any)?.message ?? '')
        const id = String((warning as any)?.id ?? (warning as any)?.loc?.file ?? '')

        // Rollup (via Vite) sometimes emits a benign warning for misplaced `/*#__PURE__*/`
        // annotations in certain `ox` versions bundled under WalletConnect/Reown deps.
        // The warning already states Rollup will remove the comment; build output is otherwise correct.
        if (
          (message.includes('contains an annotation that Rollup cannot interpret')
            || message.includes('Rollup cannot interpret due to the position of the comment'))
          && (message.includes('ox/_esm/core/Base64.js') || id.includes('ox/_esm/core/Base64.js'))
        ) {
          return
        }

        warn(warning)
      },
      input: {
        ui:         path.resolve(__dirname, 'app/src/ui/index.html'),
        background: path.resolve(__dirname, 'src/background/service-worker.ts'),
        content:    path.resolve(__dirname, 'src/content/content-script.ts'),
        inpage:     path.resolve(__dirname, 'src/inpage/inpage-provider.ts'),
      },
      output: {
        manualChunks(id) {
          return manualChunkId(id)
        },
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') return 'background.js'
          return 'assets/[name].js'
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'manifest.json') return 'manifest.json'
          return 'assets/[name][extname]'
        },
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
    copyPublicDir: false,
    sourcemap: false,
    modulePreload: false,
    minify: 'esbuild',
    target: ['chrome79', 'firefox78'],
  },
  publicDir: 'public',
})
