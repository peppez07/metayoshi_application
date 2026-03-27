import type { Network } from '../coins'

export type MultisigFamily = 'safe'

export interface MultisigSettingsState {
  enabled: boolean
  crossChainEnabled: boolean
  allowedNetworkIds: string[]
  defaultNetworkId: string | null
  supportedFamilies: {
    safe: boolean
  }
  updatedAt: number
}

const STORAGE_KEY = 'metayoshi.multisig.settings.v1'

export function createDefaultMultisigSettings(): MultisigSettingsState {
  return {
    enabled: false,
    crossChainEnabled: false,
    allowedNetworkIds: [],
    defaultNetworkId: null,
    supportedFamilies: {
      safe: true
    },
    updatedAt: Date.now()
  }
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const normalized = String(value || '').trim()
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    result.push(normalized)
  }
  return result
}

function normalizeFamilies(raw: unknown): MultisigSettingsState['supportedFamilies'] {
  return {
    safe: raw && typeof raw === 'object' ? (raw as Record<string, unknown>).safe !== false : true
  }
}

export function normalizeMultisigSettings(
  raw: unknown,
  networks: Network[]
): MultisigSettingsState {
  const defaults = createDefaultMultisigSettings()
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const knownNetworkIds = uniqueStrings(networks.map((network) => String(network.id || '').trim()))
  const allowedNetworkIds = uniqueStrings(
    Array.isArray(record.allowedNetworkIds) ? record.allowedNetworkIds.map((value) => String(value || '')) : []
  ).filter((networkId) => knownNetworkIds.includes(networkId))
  const fallbackAllowed = allowedNetworkIds.length > 0
    ? allowedNetworkIds
    : uniqueStrings(networks.filter((network) => String(network.coinType || '').trim().toUpperCase() === 'EVM').map((network) => String(network.id || '').trim()))
  const normalizedAllowed = fallbackAllowed.length > 0 ? fallbackAllowed : knownNetworkIds
  const defaultNetworkId = normalizedAllowed.includes(String(record.defaultNetworkId || '').trim())
    ? String(record.defaultNetworkId || '').trim()
    : normalizedAllowed[0] || null

  return {
    enabled: typeof record.enabled === 'boolean' ? record.enabled : defaults.enabled,
    crossChainEnabled: typeof record.crossChainEnabled === 'boolean' ? record.crossChainEnabled : defaults.crossChainEnabled,
    allowedNetworkIds: normalizedAllowed,
    defaultNetworkId,
    supportedFamilies: normalizeFamilies(record.supportedFamilies),
    updatedAt: Number.isFinite(Number(record.updatedAt)) ? Number(record.updatedAt) : defaults.updatedAt
  }
}

export function getStoredMultisigSettings(networks: Network[]): MultisigSettingsState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return normalizeMultisigSettings(parsed, networks)
  } catch {
    return normalizeMultisigSettings(null, networks)
  }
}

export function setStoredMultisigSettings(
  next: MultisigSettingsState,
  networks: Network[]
): MultisigSettingsState {
  const normalized = normalizeMultisigSettings(next, networks)
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  } catch {
    // Best effort only.
  }
  return normalized
}

export function getMultisigEnabled(state: MultisigSettingsState | null | undefined): boolean {
  return Boolean(state?.enabled)
}
