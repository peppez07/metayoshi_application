import { getCoinApiInfo } from './interceptors'
import type { Network } from './types'

export interface DonationPolicy {
  enabled: boolean
  required: boolean
  percent: number
  address: string
  source: 'bridge' | 'env'
}

export const DONATION_ENABLED_DEFAULT = true
export const DONATION_PERCENT_DEFAULT = 0.5

// Pulled from server coin integration docs:
// - scripts/windows/coins/raptoreum/APP_SERVER_INTEGRATION.md
// - scripts/windows/coins/dogecoin/APP_SERVER_INTEGRATION.md
// - scripts/windows/coins/bitcoinz/APP_SERVER_INTEGRATION.md
// - scripts/windows/coins/firo/APP_SERVER_INTEGRATION.md
const FALLBACK_DONATION_ADDRESS_BY_NETWORK: Record<string, string> = {
  rtm: 'RTRcdtm5uvFn7iQjLmEQvvcvJhKDzNsfAf',
  doge: 'DFERJBtafz4aoQbcaVcSXjiJ72ktRV9vM4',
  btcz: 't1RQhfEpBeCLo3yyNxewhCAwfTgXieQuotH',
  firo: 'aPkbNkmpaWieJ22xdeaUh7vJnPT5stjJjC'
}

const ENV_PREFIX_BY_NETWORK: Record<string, string> = {
  rtm: 'RTM',
  doge: 'DOGE',
  btcz: 'BTCZ',
  firo: 'FIRO',
  tide: 'TIDE'
}

const policyCache = new Map<string, { ts: number; value: DonationPolicy | null }>()
const CACHE_TTL_MS = 60_000

function getEnv(name: string): string {
  const env = (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env
  return String(env[name] || '').trim()
}

function parseBool(value: unknown, fallback = false): boolean {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized) return fallback
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0
  return Math.min(100, Number(value.toFixed(4)))
}

function buildAuthHeader(network: Network): Record<string, string> {
  if (!network.bridgeUsername || !network.bridgePassword) return {}
  return {
    Authorization: `Basic ${btoa(`${network.bridgeUsername}:${network.bridgePassword}`)}`
  }
}

function extractApiBase(network: Network): string {
  const bridgeUrl = String(network.bridgeUrl || '').trim().replace(/\/+$/, '')
  if (bridgeUrl) {
    const idx = bridgeUrl.indexOf('/v1/bridge')
    if (idx >= 0) return bridgeUrl.slice(0, idx)
    return bridgeUrl
  }
  return String(network.rpcUrl || '').trim().replace(/\/+$/, '')
}

function parsePolicyPayload(payload: any, fallbackPercent: number): Omit<DonationPolicy, 'source'> | null {
  const root = payload?.donation ?? payload?.policy?.donation ?? payload?.policy ?? payload
  if (!root || typeof root !== 'object') return null

  const address = String(
    root.address
    ?? root.donationAddress
    ?? root.creatorDonationAddress
    ?? root.toAddress
    ?? ''
  ).trim()
  const percent = clampPercent(Number(
    root.percent
    ?? root.donationPercent
    ?? root.pct
    ?? root.feePercent
    ?? root.donation_fee_pct
    ?? fallbackPercent
  ))
  const required = parseBool(root.required ?? root.enforced ?? root.forceDonation, false)
  const enabled = parseBool(root.enabled, true)

  if (!address || percent <= 0) return null
  return { address, percent, required, enabled }
}

async function fetchJson(url: string, headers: Record<string, string>): Promise<any | null> {
  try {
    const res = await fetch(url, { method: 'GET', headers })
    if (!res.ok) return null
    return await res.json().catch(() => null)
  } catch {
    return null
  }
}

export async function fetchCoinDonationPolicy(network: Network): Promise<DonationPolicy | null> {
  if (network.coinType !== 'UTXO') return null
  const networkId = String(network.id || '').trim().toLowerCase()
  if (!networkId) return null

  const envPrefix = ENV_PREFIX_BY_NETWORK[networkId] || String(network.symbol || '').trim().toUpperCase()
  const cacheKey = `${networkId}:${network.bridgeUrl || network.rpcUrl}`
  const now = Date.now()
  const cached = policyCache.get(cacheKey)
  if (cached && now - cached.ts < CACHE_TTL_MS) return cached.value

  const headers = buildAuthHeader(network)
  const base = extractApiBase(network)
  const bridgeUrl = String(network.bridgeUrl || '').trim().replace(/\/+$/, '')
  const apiInfo = getCoinApiInfo(networkId)
  const coin = String(apiInfo?.coinId || '').trim()
  const chain = String(apiInfo?.chain || 'main').trim()

  const explicitUrl = getEnv(`VITE_${envPrefix}_DONATION_POLICY_URL`)
  const candidates = [
    explicitUrl,
    base ? `${base}/donation` : '',
    (base && coin) ? `${base}/v1/bridge/donation/${coin}/${chain}` : '',
    (base && coin) ? `${base}/v1/bridge/config/donation/${coin}/${chain}` : '',
    (base && coin) ? `${base}/v1/bridge/policy/${coin}/${chain}` : '',
    bridgeUrl ? `${bridgeUrl}/donation` : '',
    (base && coin) ? `${base}/v1/bridge/methods/${coin}` : ''
  ].filter(Boolean)

  for (const url of candidates) {
    const json = await fetchJson(url, headers)
    const parsed = parsePolicyPayload(json, DONATION_PERCENT_DEFAULT)
    if (parsed) {
      const value: DonationPolicy = { ...parsed, source: 'bridge' }
      policyCache.set(cacheKey, { ts: now, value })
      return value
    }
  }

  const configuredAddress = getEnv(`VITE_${envPrefix}_DONATION_ADDRESS`)
  const fallbackAddress = configuredAddress || FALLBACK_DONATION_ADDRESS_BY_NETWORK[networkId] || ''
  const envPercentRaw = Number(getEnv(`VITE_${envPrefix}_DONATION_PERCENT`) || DONATION_PERCENT_DEFAULT)
  const percent = clampPercent(envPercentRaw)
  const required = parseBool(getEnv(`VITE_${envPrefix}_DONATION_REQUIRED`), false)
  const enabled = parseBool(getEnv(`VITE_${envPrefix}_DONATION_ENABLED`), DONATION_ENABLED_DEFAULT)

  if (fallbackAddress && percent > 0) {
    const value: DonationPolicy = {
      address: fallbackAddress,
      percent,
      required,
      enabled,
      source: 'env'
    }
    policyCache.set(cacheKey, { ts: now, value })
    return value
  }

  policyCache.set(cacheKey, { ts: now, value: null })
  return null
}

