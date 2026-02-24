import type {
  CoinModule,
  CoinRuntimeContext,
  Network,
  NetworkCapabilitiesInput,
  UtxoAddressSpec
} from './types'
import { RTM_API_INFO } from './interceptors'
import rtmLogo from './coinlogos/rtm.webp'

export const RTM_CAPABILITIES: NetworkCapabilitiesInput = {
  features: { nativeSend: true, assetLayer: true, assetSend: true, activity: true },
  ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
}

export const RTM_ADDRESS_SPEC: UtxoAddressSpec = {
  bip44CoinType: 175,
  p2pkhVersion: 0x3c
}

// RTM relay fee baseline is ~0.0001 RTM/kB. We keep a conservative margin.
export const RTM_FEE_PER_BYTE = 0.00002
export const RTM_DONATION_ENABLED_DEFAULT = true
export const RTM_DONATION_PERCENT_DEFAULT = 0.5
// Safe app-level fallback used when bridge donation policy is unavailable and env is unset.
export const RTM_DONATION_ADDRESS_DEFAULT = 'RTRcdtm5uvFn7iQjLmEQvvcvJhKDzNsfAf'

export interface RtmDonationPolicy {
  enabled: boolean
  required: boolean
  percent: number
  address: string
  source: 'bridge' | 'env'
}
export type CoinDonationPolicy = RtmDonationPolicy

function parseBool(value: unknown): boolean {
  const normalized = String(value ?? '').trim().toLowerCase()
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

function parsePolicyPayload(payload: any): Omit<RtmDonationPolicy, 'source'> | null {
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
    ?? RTM_DONATION_PERCENT_DEFAULT
  ))
  const required = parseBool(root.required ?? root.enforced ?? root.forceDonation)
  const enabled = parseBool(root.enabled ?? true)

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

const policyCache = new Map<string, { ts: number; value: RtmDonationPolicy | null }>()
const CACHE_TTL_MS = 60_000

const DONATION_COIN_ID_BY_NETWORK_ID: Record<string, string> = {
  rtm: 'raptoreum',
  doge: 'dogecoin',
  btcz: 'bitcoinz',
  firo: 'firo'
}

function resolveDonationCoinId(network: Network): string {
  return DONATION_COIN_ID_BY_NETWORK_ID[String(network.id || '').trim()] || ''
}

function resolveDonationEnvPrefix(network: Network): string {
  const id = String(network.id || '').trim().toUpperCase()
  if (!id) return ''
  if (id === 'DOGE') return 'DOGE'
  if (id === 'BTCZ') return 'BTCZ'
  if (id === 'RTM') return 'RTM'
  return id
}

export function supportsCoinDonationPolicy(network: Network): boolean {
  return Boolean(resolveDonationCoinId(network))
}

function readDonationPolicyFromEnv(network: Network): RtmDonationPolicy | null {
  const prefix = resolveDonationEnvPrefix(network)
  if (!prefix) return null
  const configuredAddress = String((import.meta.env as any)[`VITE_${prefix}_DONATION_ADDRESS`] || '').trim()
  const envPercent = clampPercent(Number((import.meta.env as any)[`VITE_${prefix}_DONATION_PERCENT`] || RTM_DONATION_PERCENT_DEFAULT))
  if (!configuredAddress || envPercent <= 0) return null
  return {
    address: configuredAddress,
    percent: envPercent,
    required: parseBool((import.meta.env as any)[`VITE_${prefix}_DONATION_REQUIRED`] || false),
    enabled: true,
    source: 'env'
  }
}

export async function fetchCoinDonationPolicy(network: Network): Promise<CoinDonationPolicy | null> {
  const coinId = resolveDonationCoinId(network)
  if (!coinId) return null
  const cacheKey = `${network.id}:${network.bridgeUrl || network.rpcUrl}`
  const now = Date.now()
  const cached = policyCache.get(cacheKey)
  if (cached && now - cached.ts < CACHE_TTL_MS) return cached.value

  const headers = buildAuthHeader(network)
  const base = extractApiBase(network)
  const bridgeUrl = String(network.bridgeUrl || '').trim().replace(/\/+$/, '')
  const candidates = [
    base ? `${base}/donation` : '',
    base ? `${base}/v1/bridge/donation/${coinId}/main` : '',
    base ? `${base}/v1/bridge/config/donation/${coinId}/main` : '',
    base ? `${base}/v1/bridge/policy/${coinId}/main` : '',
    bridgeUrl ? `${bridgeUrl}/donation` : '',
    base ? `${base}/v1/bridge/methods/${coinId}` : ''
  ].filter(Boolean)

  for (const url of candidates) {
    const json = await fetchJson(url, headers)
    const parsed = parsePolicyPayload(json)
    if (parsed) {
      const value: RtmDonationPolicy = { ...parsed, source: 'bridge' }
      policyCache.set(cacheKey, { ts: now, value })
      return value
    }
  }

  const envValue = readDonationPolicyFromEnv(network)
  if (envValue) {
    policyCache.set(cacheKey, { ts: now, value: envValue })
    return envValue
  }

  policyCache.set(cacheKey, { ts: now, value: null })
  return null
}

export async function fetchRtmDonationPolicy(network: Network): Promise<RtmDonationPolicy | null> {
  if (network.id !== 'rtm') return null
  const cacheKey = `${network.id}:${network.bridgeUrl || network.rpcUrl}`
  const now = Date.now()
  const cached = policyCache.get(cacheKey)
  if (cached && now - cached.ts < CACHE_TTL_MS) return cached.value

  const headers = buildAuthHeader(network)
  const base = extractApiBase(network)
  const bridgeUrl = String(network.bridgeUrl || '').trim().replace(/\/+$/, '')
  const explicitUrl = String(import.meta.env.VITE_RTM_DONATION_POLICY_URL || '').trim()
  const candidates = [
    explicitUrl,
    base ? `${base}/donation` : '',
    base ? `${base}/v1/bridge/donation/raptoreum/main` : '',
    base ? `${base}/v1/bridge/config/donation/raptoreum/main` : '',
    base ? `${base}/v1/bridge/policy/raptoreum/main` : '',
    bridgeUrl ? `${bridgeUrl}/donation` : '',
    base ? `${base}/v1/bridge/methods/raptoreum` : ''
  ].filter(Boolean)

  for (const url of candidates) {
    const json = await fetchJson(url, headers)
    const parsed = parsePolicyPayload(json)
    if (parsed) {
      const value: RtmDonationPolicy = { ...parsed, source: 'bridge' }
      policyCache.set(cacheKey, { ts: now, value })
      return value
    }
  }

  const configuredAddress = String(import.meta.env.VITE_RTM_DONATION_ADDRESS || '').trim()
  const fallbackAddress = configuredAddress || RTM_DONATION_ADDRESS_DEFAULT
  const envPercent = clampPercent(Number(import.meta.env.VITE_RTM_DONATION_PERCENT || RTM_DONATION_PERCENT_DEFAULT))
  if (fallbackAddress && envPercent > 0) {
    const value: RtmDonationPolicy = {
      address: fallbackAddress,
      percent: envPercent,
      required: parseBool(import.meta.env.VITE_RTM_DONATION_REQUIRED || false),
      enabled: true,
      source: 'env'
    }
    policyCache.set(cacheKey, { ts: now, value })
    return value
  }

  policyCache.set(cacheKey, { ts: now, value: null })
  return null
}

export function estimateRtmFee(txBytes: number): number {
  return txBytes * RTM_FEE_PER_BYTE
}

export function createRtmNetwork(ctx: CoinRuntimeContext): Network {
  void ctx
  const wallet = import.meta.env.VITE_RTM_WALLET || RTM_API_INFO.defaultWallet || 'mainwallet'
  const bridgeDefault = RTM_API_INFO.defaultBridgeUrl
  return {
    id: 'rtm',
    name: 'Raptoreum',
    symbol: 'RTM',
    coinType: 'UTXO',
    coinSymbol: 'RTM',
    rpcUrl: import.meta.env.VITE_RTM_RPC || RTM_API_INFO.defaultRpcUrl,
    rpcWallet: wallet,
    rpcUsername: 'rpcuser',
    rpcPassword: 'rpcpass',
    bridgeUrl: import.meta.env.VITE_RTM_BRIDGE_URL || bridgeDefault,
    explorerUrl: import.meta.env.VITE_RTM_EXPLORER || RTM_API_INFO.defaultExplorerUrl || 'https://explorer.raptoreum.com',
    capabilities: RTM_CAPABILITIES,
    feePerByte: RTM_FEE_PER_BYTE,
    logo: rtmLogo
  }
}

export const rtmCoin: CoinModule = {
  id: 'rtm',
  symbol: 'RTM',
  coinSymbol: 'RTM',
  capabilities: RTM_CAPABILITIES,
  utxoAddress: RTM_ADDRESS_SPEC,
  createNetwork: createRtmNetwork,
  estimateFee: estimateRtmFee
}
