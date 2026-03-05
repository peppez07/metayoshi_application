import { createRequestCache } from './requestCache'

export type SolanaTokenRegistryEntry = {
  address: string
  symbol: string
  name: string
  decimals: number
  logoURI?: string
}

const tokenListCache = createRequestCache<Record<string, SolanaTokenRegistryEntry>>({
  defaultTtlMs: 24 * 60 * 60_000,
  maxEntries: 2
})

function normalizeMint(mint: string): string {
  return String(mint || '').trim()
}

function readEnvFlag(name: string, fallback = false): boolean {
  const env = ((import.meta as any)?.env || {}) as Record<string, unknown>
  const raw = String(env?.[name] ?? '').trim().toLowerCase()
  if (!raw) return fallback
  if (['1', 'true', 'yes', 'on'].includes(raw)) return true
  if (['0', 'false', 'no', 'off'].includes(raw)) return false
  return fallback
}

export async function getSolanaTokenRegistry(): Promise<Record<string, SolanaTokenRegistryEntry>> {
  return await tokenListCache.get('solana-token-registry:jupiter', async () => {
    const env = ((import.meta as any)?.env || {}) as Record<string, unknown>
    const configuredUrl = String(env?.VITE_SOL_TOKEN_REGISTRY_URL || '').trim()
    const allowPublicRegistry = readEnvFlag('VITE_SOL_ALLOW_PUBLIC_TOKEN_REGISTRY', false)
    // Default behavior: no external token-registry call unless explicitly allowed/configured.
    const url = configuredUrl || (allowPublicRegistry ? 'https://token.jup.ag/all' : '')
    if (!url) return {}

    const res = await fetch(url, { method: 'GET' })
    if (!res.ok) throw new Error(`Failed to fetch Solana token registry (${res.status})`)
    const json = await res.json()
    if (!Array.isArray(json)) return {}

    const out: Record<string, SolanaTokenRegistryEntry> = {}
    for (const row of json) {
      const address = normalizeMint(row?.address)
      const symbol = String(row?.symbol || '').trim()
      const name = String(row?.name || '').trim()
      const decimals = Number(row?.decimals ?? 0)
      if (!address) continue
      if (!symbol && !name) continue
      out[address] = {
        address,
        symbol: symbol || name || address.slice(0, 6),
        name: name || symbol || address.slice(0, 6),
        decimals: Number.isFinite(decimals) ? Math.max(0, Math.trunc(decimals)) : 0,
        logoURI: String(row?.logoURI || '').trim() || undefined
      }
    }
    return out
  }).catch(() => ({}))
}

