import { getBundledCoinRegistryEntries } from './coinRegistry'
import { resolveEnabledNetworkIds } from './coinSelection'
import { loadServerRegistrySnapshotFromApi } from './serverRegistry/runtime'
import { mapServerCoinIdToNetworkId, validateEthereumLayer2NetworkIdMapping } from './serverRegistry/mappings'
import { resolvePublicApiBaseUrl } from '../lib/apiBase'
import { normalizeBridgeCredentialValue } from '../lib/bridgeCredentials'
import { sanitizeNetworkServerOnly } from '../lib/serverOnly'
import type { ServerCoinCatalogItem, ServerCoinCatalogKind } from './serverRegistry/types'
import type { CoinModule, CoinRuntimeContext, Network, UtxoAddressSpec } from './types'

export type { CoinType, Network } from './types'
export type { ServerCoinCatalogItem, ServerCoinCatalogKind } from './serverRegistry/types'
export { getCoinRuntimeProfile, type CoinRuntimeProfile } from './runtimeProfile'

const API_BASE_URL = resolvePublicApiBaseUrl(import.meta.env.VITE_API_BASE_URL)
const APP_API_KEY = String((import.meta as any)?.env?.VITE_APP_API_KEY || '').trim()
const GLOBAL_BRIDGE_USER = normalizeBridgeCredentialValue((import.meta as any)?.env?.VITE_BRIDGE_USER)
const GLOBAL_BRIDGE_PASSWORD = normalizeBridgeCredentialValue((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD)
const TEMPORARILY_DISABLED_NETWORK_IDS = new Set<string>(['ada', 'xmr', 'xrp'])

if ((GLOBAL_BRIDGE_USER && !GLOBAL_BRIDGE_PASSWORD) || (!GLOBAL_BRIDGE_USER && GLOBAL_BRIDGE_PASSWORD)) {
  throw new Error(
    'Bridge credentials are partially configured. ' +
    'Set both VITE_BRIDGE_USER and VITE_BRIDGE_PASSWORD, or leave both unset.'
  )
}

export function buildBridgeUrl(coin: string, chain: 'main' | 'test', wallet?: string): string {
  const base = `${API_BASE_URL}/v1/bridge/${coin}/${chain}`
  return wallet ? `${base}/wallet/${encodeURIComponent(wallet)}` : base
}

const runtimeContext: CoinRuntimeContext = {
  apiBaseUrl: API_BASE_URL,
  buildBridgeUrl
}

export const DEFAULT_NETWORK_ID = 'rtm'
export const DEFAULT_UTXO_COIN_SYMBOL = 'RTM'

function uniqCoinModulesById(modules: CoinModule[]): CoinModule[] {
  const out: CoinModule[] = []
  const seen = new Set<string>()
  for (const mod of modules) {
    const id = String(mod?.id || '').trim()
    if (!id) continue
    if (seen.has(id)) continue
    seen.add(id)
    out.push(mod)
  }
  return out
}

const RAW_COIN_MODULES: CoinModule[] = [
  ...getBundledCoinRegistryEntries().map((entry) => entry.coin)
]

export const ALL_COIN_MODULES: CoinModule[] = uniqCoinModulesById(RAW_COIN_MODULES)

const ALL_COIN_IDS = new Set(ALL_COIN_MODULES.map((coin) => coin.id))
export const ENABLED_NETWORK_IDS = resolveEnabledNetworkIds(ALL_COIN_MODULES)

const MODULE_BY_NETWORK_ID = new Map<string, CoinModule>(
  ALL_COIN_MODULES.map((coin) => [coin.id, coin])
)

const UTXO_ADDRESS_SPECS: Record<string, UtxoAddressSpec> = {}
for (const coin of ALL_COIN_MODULES) {
  if (!coin.coinSymbol || !coin.utxoAddress) continue
  const symbol = coin.coinSymbol.toUpperCase()
  if (!UTXO_ADDRESS_SPECS[symbol]) {
    UTXO_ADDRESS_SPECS[symbol] = coin.utxoAddress
  }
}

function withGlobalBridgeCredentials(network: Network): Network {
  if (!GLOBAL_BRIDGE_USER || !GLOBAL_BRIDGE_PASSWORD) return network
  return {
    ...network,
    bridgeUsername: GLOBAL_BRIDGE_USER,
    bridgePassword: GLOBAL_BRIDGE_PASSWORD
  }
}

export const ALL_NETWORKS: Network[] = ALL_COIN_MODULES
  .map((coin) => coin.createNetwork(runtimeContext))
  .map(withGlobalBridgeCredentials)
  .map((network) => sanitizeNetworkServerOnly(network, API_BASE_URL))

function validateEnabledNetworkIds(enabledIds: Set<string>, knownIds: Set<string>): void {
  if (enabledIds.size <= 0) {
    throw new Error('No enabled networks were resolved from the bundled coin registry.')
  }
  for (const id of enabledIds) {
    if (!knownIds.has(id)) {
      throw new Error(`Enabled network id has no matching coin module: ${id}`)
    }
  }
}

function validateConfiguredNetworks(networks: Network[]): void {
  const seenIds = new Set<string>()

  for (const network of networks) {
    const id = String(network?.id || '').trim()
    const name = String(network?.name || '').trim()
    const symbol = String(network?.symbol || '').trim()
    const rpcUrl = String(network?.rpcUrl || '').trim()
    const bridgeUrl = String(network?.bridgeUrl || '').trim()
    const registeredCoinModule = MODULE_BY_NETWORK_ID.get(id)

    if (!id) throw new Error('Configured network is missing `id`')
    if (seenIds.has(id)) throw new Error(`Duplicate configured network id: ${id}`)
    seenIds.add(id)

    if (!registeredCoinModule) {
      throw new Error(`Configured network ${id} has no registered coin module`)
    }
    if (!name) throw new Error(`Configured network ${id} is missing \`name\``)
    if (!symbol) throw new Error(`Configured network ${id} is missing \`symbol\``)
    if (!rpcUrl && !bridgeUrl) {
      throw new Error(`Configured network ${id} is missing both \`bridgeUrl\` and \`rpcUrl\``)
    }
    if (!network.capabilities) throw new Error(`Configured network ${id} is missing \`capabilities\``)

    if (network.coinType === 'UTXO') {
      const coinSymbol = String(network.coinSymbol || '').trim().toUpperCase()
      const feePerByte = Number(network.feePerByte)
      if (!coinSymbol) throw new Error(`UTXO network ${id} is missing \`coinSymbol\``)
      if (!UTXO_ADDRESS_SPECS[coinSymbol]) {
        throw new Error(`UTXO network ${id} has no registered address spec for ${coinSymbol}`)
      }
      if (!Number.isFinite(feePerByte) || feePerByte <= 0) {
        throw new Error(`UTXO network ${id} is missing a valid \`feePerByte\``)
      }
    }

    if (network.coinType === 'EVM') {
      if (!Number.isInteger(network.chainId) || Number(network.chainId) <= 0) {
        throw new Error(`EVM network ${id} is missing a valid numeric \`chainId\``)
      }
      if (!String(network.serverCoinId || '').trim()) {
        throw new Error(`EVM network ${id} is missing \`serverCoinId\``)
      }
    }

    if (network.coinType === 'COSMOS') {
      if (!String(network.runtimeModelId || '').trim()) {
        throw new Error(`Cosmos network ${id} is missing \`runtimeModelId\``)
      }
    }
  }
}

validateEnabledNetworkIds(ENABLED_NETWORK_IDS, ALL_COIN_IDS)
validateConfiguredNetworks(ALL_NETWORKS)
export const INITIAL_NETWORKS: Network[] = ALL_NETWORKS.filter((network) => (
  ENABLED_NETWORK_IDS.has(network.id)
  && !TEMPORARILY_DISABLED_NETWORK_IDS.has(String(network.id || '').trim())
))

function listStartupNetworkIds(networks: Network[]): string[] {
  return networks
    .map((network) => String(network?.id || '').trim().toLowerCase())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
}

function validateInitialNetworks(networks: Network[]): void {
  if (networks.length > 0) return
  throw new Error(
    'No startup networks remain enabled after applying the bundled registry, build config, and environment filters. ' +
    'Review VITE_ENABLED_COINS, VITE_DISABLED_COINS, and metayoshi.build.json.'
  )
}

function validateConfiguredDefaultNetworkId(configuredId: string, networks: Network[]): void {
  if (!configuredId) return
  const enabledStartupIds = new Set(listStartupNetworkIds(networks))
  if (enabledStartupIds.has(configuredId)) return
  throw new Error(
    `VITE_DEFAULT_NETWORK=${configuredId} does not resolve to an enabled startup network. ` +
    `Enabled startup networks: ${[...enabledStartupIds].join(', ')}`
  )
}

validateInitialNetworks(INITIAL_NETWORKS)

const CONFIGURED_DEFAULT_NETWORK_ID = String(import.meta.env.VITE_DEFAULT_NETWORK ?? '').trim().toLowerCase()
validateConfiguredDefaultNetworkId(CONFIGURED_DEFAULT_NETWORK_ID, INITIAL_NETWORKS)

export const DEFAULT_ACTIVE_NETWORK_ID =
  INITIAL_NETWORKS.find((n) => String(n.id || '').trim().toLowerCase() === (CONFIGURED_DEFAULT_NETWORK_ID || DEFAULT_NETWORK_ID))?.id
  ?? INITIAL_NETWORKS[0]?.id
  ?? DEFAULT_NETWORK_ID

export function getUtxoAddressSpec(coinSymbol: string): UtxoAddressSpec | undefined {
  return UTXO_ADDRESS_SPECS[coinSymbol.toUpperCase()]
}

export function getAllUtxoAddressSpecs(): Record<string, UtxoAddressSpec> {
  return { ...UTXO_ADDRESS_SPECS }
}

export function estimateNetworkFee(networkId: string, txBytes: number): number | undefined {
  const module = MODULE_BY_NETWORK_ID.get(networkId)
  if (module?.estimateFee) return module.estimateFee(txBytes)
  const network = ALL_NETWORKS.find((n) => n.id === networkId)
  const feePerByte = Number(network?.feePerByte)
  if (Number.isFinite(feePerByte) && feePerByte > 0) return txBytes * feePerByte
  return undefined
}

validateEthereumLayer2NetworkIdMapping()

function normalizeNetworkId(value: unknown): string {
  return String(value || '').trim().toLowerCase()
}

function isEnabledNetworkId(value: unknown): boolean {
  const normalized = normalizeNetworkId(value)
  return Boolean(normalized) && ENABLED_NETWORK_IDS.has(normalized)
}

function shouldIncludeServerCatalogItem(item: ServerCoinCatalogItem): boolean {
  const appNetworkId = normalizeNetworkId(item.appNetworkId)
  if (appNetworkId && !appNetworkId.includes('--')) return isEnabledNetworkId(appNetworkId)

  const runtimeModelId = normalizeNetworkId(item.runtimeModelId)
  if (runtimeModelId) return isEnabledNetworkId(runtimeModelId)

  const mappedNetworkId = normalizeNetworkId(mapServerCoinIdToNetworkId(item.coinId))
  if (mappedNetworkId) return isEnabledNetworkId(mappedNetworkId)

  return true
}

export async function loadServerRegistrySnapshot(): Promise<{
  networks: Network[] | null
  catalog: ServerCoinCatalogItem[]
}> {
  const snapshot = await loadServerRegistrySnapshotFromApi({
    apiBaseUrl: API_BASE_URL,
    appApiKey: APP_API_KEY,
    defaultBridgeUser: GLOBAL_BRIDGE_USER,
    defaultBridgePassword: GLOBAL_BRIDGE_PASSWORD,
    allNetworks: ALL_NETWORKS,
    allCoinIds: ALL_COIN_IDS
  })
  const filteredNetworks = Array.isArray(snapshot.networks)
    ? snapshot.networks
      .filter((network) => isEnabledNetworkId(network?.id))
      .filter((network) => !TEMPORARILY_DISABLED_NETWORK_IDS.has(String(network?.id || '').trim()))
      .map((network) => sanitizeNetworkServerOnly(network, API_BASE_URL))
    : null
  const filteredCatalog = Array.isArray(snapshot.catalog)
    ? snapshot.catalog.filter(shouldIncludeServerCatalogItem)
    : []
  return {
    ...snapshot,
    networks: filteredNetworks,
    catalog: filteredCatalog
  }
}

export async function loadNetworksFromServerRegistry(): Promise<Network[] | null> {
  const snapshot = await loadServerRegistrySnapshot()
  return snapshot.networks
}
