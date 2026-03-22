import type { Network } from '../types'
import { buildDiscoveredUrl, discoverWalletBackend, fetchDiscoveredChains } from '../../lib/backendHelp'
import { buildServerCoinCatalog, isLikelyTokenServerCoin } from './catalog'
import {
  EVM_MODEL_NETWORK_IDS,
  isBlockedServerCoinId,
  mapServerCoinIdToNetworkId,
  normalizeServerCoinSymbol,
  resolveAppNetworkId
} from './mappings'
import {
  createGenericServerNetwork,
  inferBridgeCapabilities,
  isNetworkSpendable,
  isPublicnodeNetworkRow,
  mergeCapabilityInputs,
  resolveActiveServerNetwork,
  resolveBridgeUrlForNetwork,
  scoreCandidate,
  supportsEvmBridgeMethods
} from './networks'
import { sanitizeRpcUrl } from '../../lib/serverOnly'
import {
  isServerCoinBridgeEnabled,
  resolveServerCoinChain,
  resolveServerCoinId,
  type NetworkCandidate,
  type ServerCoinCatalogItem,
  type ServerCoinRow
} from './types'

type DiscoveredChainRow = {
  chainKey?: unknown
  isEnabled?: unknown
  supportsBalances?: unknown
  supportsSend?: unknown
  supportsSwap?: unknown
}

function asDiscoveredChainItems(payload: Record<string, unknown> | null): DiscoveredChainRow[] {
  const items = payload?.items
  return Array.isArray(items) ? items as DiscoveredChainRow[] : []
}

function normalizeDiscoveredChainKey(value: unknown): string {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return ''
  switch (normalized) {
    case 'ethereum':
      return 'eth'
    case 'arbitrum-one':
      return 'arb'
    case 'optimism':
      return 'op'
    case 'sol':
    case 'solana-mainnet':
      return 'solana'
    case 'bnb':
      return 'bsc'
    case 'cosmos':
    case 'cosmoshub-4':
      return 'cosmoshub'
    case 'osmosis-1':
      return 'osmosis'
    case 'tron-mainnet':
      return 'tron'
    default:
      return normalized
  }
}

function resolveExpectedChainRegistryKey(coinId: string, modelNetworkId: string | null): string {
  const normalizedCoinId = String(coinId || '').trim().toLowerCase()
  const normalizedModelId = String(modelNetworkId || '').trim().toLowerCase()

  if (normalizedCoinId === 'ethereum' || normalizedModelId === 'eth') return 'eth'
  if (normalizedCoinId === 'arbitrum-one' || normalizedModelId === 'arb') return 'arb'
  if (normalizedCoinId === 'optimism' || normalizedModelId === 'op') return 'op'
  if (normalizedCoinId === 'base' || normalizedModelId === 'base') return 'base'
  if (normalizedCoinId === 'bsc' || normalizedModelId === 'bnb') return 'bsc'
  if (normalizedCoinId === 'solana' || normalizedModelId === 'sol') return 'solana'
  if (normalizedCoinId === 'cosmos' || normalizedModelId === 'cosmos') return 'cosmoshub'
  if (normalizedCoinId === 'osmosis' || normalizedModelId === 'osmosis') return 'osmosis'
  if (normalizedCoinId === 'tron' || normalizedModelId === 'tron') return 'tron'
  if (normalizedCoinId === 'sui' || normalizedModelId === 'sui') return 'sui'
  return ''
}

function requiresDiscoveredChainContract(coinId: string, modelNetworkId: string | null): boolean {
  return Boolean(resolveExpectedChainRegistryKey(coinId, modelNetworkId))
}

function resolveDiscoveredChainRecord(
  items: DiscoveredChainRow[],
  coinId: string,
  modelNetworkId: string | null
): DiscoveredChainRow | null {
  const expectedKey = resolveExpectedChainRegistryKey(coinId, modelNetworkId)
  if (!expectedKey) return null
  return items.find((item) => normalizeDiscoveredChainKey(item.chainKey) === expectedKey) || null
}

function applyDiscoveredChainCapabilities(
  capabilities: Network['capabilities'],
  chainRecord: DiscoveredChainRow | null
): Network['capabilities'] {
  const baseFeatures = capabilities?.features || {}
  const baseUi = capabilities?.ui || {}
  if (!chainRecord) {
    return {
      features: { ...baseFeatures },
      ui: { ...baseUi }
    }
  }

  const supportsBalances = chainRecord.supportsBalances === true
  const supportsSend = chainRecord.supportsSend === true
  const supportsSwap = chainRecord.supportsSwap === true

  return {
    features: {
      ...baseFeatures,
      nativeSend: Boolean(baseFeatures.nativeSend) && supportsSend,
      assetSend: Boolean(baseFeatures.assetSend) && supportsSend,
      activity: Boolean(baseFeatures.activity) && supportsBalances,
      swap: Boolean(baseFeatures.swap) && supportsSwap
    },
    ui: {
      ...baseUi,
      showAssetsTab: Boolean(baseUi.showAssetsTab) && supportsBalances,
      showAssetsAction: Boolean(baseUi.showAssetsAction) && supportsBalances,
      showSendAction: Boolean(baseUi.showSendAction) && supportsSend,
      showActivityTab: Boolean(baseUi.showActivityTab) && supportsBalances,
      showSwapAction: Boolean(baseUi.showSwapAction) && supportsSwap
    }
  }
}

export async function loadServerRegistrySnapshotFromApi(input: {
  apiBaseUrl: string
  appApiKey: string
  defaultBridgeUser?: string
  defaultBridgePassword?: string
  allNetworks: Network[]
  allCoinIds: Set<string>
}): Promise<{
  networks: Network[] | null
  catalog: ServerCoinCatalogItem[]
}> {
  const headers: Record<string, string> = {}
  if (input.appApiKey) headers['X-API-Key'] = input.appApiKey
  const username = String(input.defaultBridgeUser || '').trim()
  const password = String(input.defaultBridgePassword || '').trim()
  if (username && password) {
    headers.Authorization = `Basic ${btoa(`${username}:${password}`)}`
  }
  const discovery = await discoverWalletBackend(input.apiBaseUrl).catch(() => null)
  const requestUrl = buildDiscoveredUrl(discovery?.coinsUrl) || `${input.apiBaseUrl}/v1/coins`
  const response = await fetch(requestUrl, { method: 'GET', headers })
  if (!response.ok) {
    throw new Error(`Server coin registry fetch failed: HTTP ${response.status}`)
  }
  const json = await response.json().catch(() => null)
  const coins = Array.isArray(json?.coins) ? (json.coins as ServerCoinRow[]) : []
  const discoveredChains = await fetchDiscoveredChains(input.apiBaseUrl).catch(() => null)
  const discoveredChainItems = asDiscoveredChainItems(discoveredChains)
  if (coins.length === 0) return { networks: null, catalog: [] }

  const catalog = buildServerCoinCatalog(coins).filter((item) => {
    if (!requiresDiscoveredChainContract(item.coinId, item.runtimeModelId)) return true
    return Boolean(resolveDiscoveredChainRecord(discoveredChainItems, item.coinId, item.runtimeModelId))
  })
  const moduleById = new Map<string, Network>(input.allNetworks.map((n) => [n.id, n]))
  const candidatesByAppNetworkId = new Map<string, NetworkCandidate[]>()

  for (const coin of coins) {
    if (!coin?.enabled) continue
    if (!isServerCoinBridgeEnabled(coin)) continue
    const coinId = resolveServerCoinId(coin)
    if (!coinId) continue
    if (isBlockedServerCoinId(coinId)) continue
    if (isLikelyTokenServerCoin(coin)) continue

    const modelNetworkId = mapServerCoinIdToNetworkId(coinId)
    const selectedNetwork = resolveActiveServerNetwork(coin.networks)
    const chain = resolveServerCoinChain(coin, selectedNetwork)
    const rpcWallet = String(selectedNetwork?.rpcWallet || '').trim()
    const modernBridgeReady = Boolean(
      coin.bridgeImplemented !== false
      && coin.capabilities?.rpcBridge !== false
      && (
        coin.capabilities?.sync
        || coin.capabilities?.balance
        || coin.capabilities?.history
        || coin.capabilities?.send
        || coin.capabilities?.broadcast
      )
    )

    const canUseMappedModel = Boolean(
      modelNetworkId
      && moduleById.get(modelNetworkId)
      && (
        !EVM_MODEL_NETWORK_IDS.has(modelNetworkId)
        || supportsEvmBridgeMethods(coin.methodGroups)
        || modernBridgeReady
      )
    )
    const discoveredChainRecord = resolveDiscoveredChainRecord(discoveredChainItems, coinId, modelNetworkId)
    if (requiresDiscoveredChainContract(coinId, modelNetworkId) && !discoveredChainRecord) {
      continue
    }

    if (canUseMappedModel && modelNetworkId) {
      const base = moduleById.get(modelNetworkId)!
      const appNetworkId = resolveAppNetworkId(modelNetworkId, coinId)
      const inferredCapabilities = inferBridgeCapabilities(
        coinId,
        modelNetworkId,
        coin.methodGroups,
        coin.capabilities
      )
      const mergedCapabilities = mergeCapabilityInputs(base.capabilities, inferredCapabilities)
      const normalizedCapabilities = applyDiscoveredChainCapabilities(mergedCapabilities, discoveredChainRecord)
      const mappedNetwork: Network = {
        ...base,
        id: appNetworkId,
        runtimeModelId: String(base.runtimeModelId || modelNetworkId || '').trim() || undefined,
        serverCoinId: coinId,
        serverChain: chain,
        name: String(coin.name || base.name).trim() || base.name,
        symbol: normalizeServerCoinSymbol(coinId, String(coin.symbol || '').trim(), base.symbol) || base.symbol,
        rpcUrl: sanitizeRpcUrl(
          String(selectedNetwork?.rpcUrl || base.rpcUrl).trim() || base.rpcUrl,
          input.apiBaseUrl
        ),
        rpcWallet: rpcWallet || base.rpcWallet || '',
        rpcUsername: String(selectedNetwork?.rpcUser || base.rpcUsername || '').trim(),
        bridgeUrl: resolveBridgeUrlForNetwork(input.apiBaseUrl, modelNetworkId, coinId, chain, rpcWallet),
        bridgeUsername: input.defaultBridgeUser || undefined,
        bridgePassword: input.defaultBridgePassword || undefined,
        capabilities: normalizedCapabilities
      }
      if (!isNetworkSpendable(mappedNetwork)) continue
      const row = candidatesByAppNetworkId.get(appNetworkId) || []
      row.push({
        appNetworkId,
        network: mappedNetwork,
        chain,
        isPublicnode: selectedNetwork ? isPublicnodeNetworkRow(selectedNetwork) : false
      })
      candidatesByAppNetworkId.set(appNetworkId, row)
      continue
    }

    const genericNetwork = createGenericServerNetwork({
      apiBaseUrl: input.apiBaseUrl,
      defaultBridgeUser: input.defaultBridgeUser,
      defaultBridgePassword: input.defaultBridgePassword,
      coinId,
      coin,
      chain,
      selectedNetwork
    })
    if (!isNetworkSpendable(genericNetwork)) continue
    const row = candidatesByAppNetworkId.get(genericNetwork.id) || []
    row.push({
      appNetworkId: genericNetwork.id,
      network: genericNetwork,
      chain,
      isPublicnode: selectedNetwork ? isPublicnodeNetworkRow(selectedNetwork) : false
    })
    candidatesByAppNetworkId.set(genericNetwork.id, row)
  }

  if (candidatesByAppNetworkId.size === 0) {
    return {
      networks: null,
      catalog
    }
  }

  const bestByNetworkId = new Map<string, Network>()
  for (const [appNetworkId, rows] of candidatesByAppNetworkId.entries()) {
    if (!rows || rows.length === 0) continue
    const sorted = [...rows].sort((a, b) => scoreCandidate(b) - scoreCandidate(a))
    bestByNetworkId.set(appNetworkId, sorted[0].network)
  }

  const selectedIds = new Set(bestByNetworkId.keys())
  const canonical = input.allNetworks.filter((n) => selectedIds.has(n.id)).map((n) => (
    bestByNetworkId.get(n.id) || n
  ))
  const extra = [...bestByNetworkId.values()]
    .filter((n) => !input.allCoinIds.has(n.id))
    .sort((a, b) => {
      const left = `${a.name}|${a.id}`.toLowerCase()
      const right = `${b.name}|${b.id}`.toLowerCase()
      return left.localeCompare(right)
    })
  const ordered = [...canonical, ...extra]
  const mustKeepNetworkIds = new Set<string>(['doge', 'eth'])
  const withRequired = [...ordered]
  for (const requiredId of mustKeepNetworkIds) {
    if (withRequired.some((n) => n.id === requiredId)) continue
    const fallback = input.allNetworks.find((n) => n.id === requiredId)
    if (fallback) withRequired.push(fallback)
  }

  return {
    networks: withRequired.length > 0 ? withRequired : null,
    catalog
  }
}
