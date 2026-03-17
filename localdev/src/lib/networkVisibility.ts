import type { Network } from '../coins'

function normalizeNetworkIdValue(value: unknown): string {
  return String(value || '').trim()
}

function normalizeChainValue(value: unknown): 'main' | 'test' {
  return String(value || '').trim().toLowerCase() === 'test' ? 'test' : 'main'
}

export function normalizeDisabledNetworkIds(
  disabledNetworkIds: unknown,
  networks: Network[]
): string[] {
  if (!Array.isArray(disabledNetworkIds)) return []
  const knownIds = new Set(networks.map((network) => normalizeNetworkIdValue(network.id)).filter(Boolean))
  const out: string[] = []
  const seen = new Set<string>()
  for (const value of disabledNetworkIds) {
    const networkId = normalizeNetworkIdValue(value)
    if (!networkId || !knownIds.has(networkId) || seen.has(networkId)) continue
    seen.add(networkId)
    out.push(networkId)
  }
  return out
}

export function getEnabledNetworks(networks: Network[], disabledNetworkIds: unknown): Network[] {
  const normalizedDisabled = new Set(normalizeDisabledNetworkIds(disabledNetworkIds, networks))
  const filtered = networks.filter((network) => !normalizedDisabled.has(normalizeNetworkIdValue(network.id)))
  return filtered.length > 0 ? filtered : networks
}

export function isNetworkEnabled(networkId: string, disabledNetworkIds: unknown): boolean {
  if (!Array.isArray(disabledNetworkIds)) return true
  const target = normalizeNetworkIdValue(networkId)
  return !disabledNetworkIds.some((value) => normalizeNetworkIdValue(value) === target)
}

export function getNetworkChainGroup(network?: Pick<Network, 'displayChain' | 'serverChain'> | null): 'main' | 'test' {
  return normalizeChainValue(network?.displayChain || network?.serverChain)
}

export function splitNetworksByChain<T extends Pick<Network, 'displayChain' | 'serverChain'>>(networks: T[]): {
  main: T[]
  test: T[]
} {
  const main: T[] = []
  const test: T[] = []
  for (const network of networks) {
    if (getNetworkChainGroup(network) === 'test') {
      test.push(network)
      continue
    }
    main.push(network)
  }
  return { main, test }
}
