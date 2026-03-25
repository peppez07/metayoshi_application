import type { Network } from '../../coins'
import type { ServerCoinCatalogItem } from '../../coins'
import { RESEARCH_TOP100_CATALOG_SNAPSHOT, type ResearchCatalogAsset } from './researchSnapshot'
import { normalizeActivityAssetId } from '../activityIdentity'

type CatalogSource = 'bundled-registry' | 'research-top100' | 'metayoshi-server'

export type CatalogModelAssetRow = {
  coinId: string
  name: string
  symbol: string
  kind: 'main' | 'asset'
  contractAddress?: string
  logoUrl?: string
}

export type CatalogModelSummary = {
  modelId: string
  mainCount: number
  assetCount: number
  assetRows: CatalogModelAssetRow[]
}

export type CatalogServerAssetSearchInput = {
  query?: string
  networkId?: string
  runtimeModelId?: string | null
  includeMain?: boolean
  maxResults?: number
}

export type CatalogTrackedEvmToken = {
  address: string
  symbol: string
  decimals: number
  logoUri?: string
}

export type CatalogTrackedEvmNft = {
  address: string
  tokenId: string
  standard: 'erc721' | 'erc1155' | 'auto'
  label?: string
}

export type CachedAssetSnapshot = {
  accountId: string
  networkId: string
  address: string
  fetchedAt: number
  assets: Record<string, number>
  logos: Record<string, string>
  labels: Record<string, string>
  evmNfts: Record<string, unknown>
}

export type CachedFiatSnapshot = {
  accountId: string
  networkId: string
  address: string
  fetchedAt: number
  totals: Record<string, number | null>
  native: Record<string, number | null>
  assets: Record<string, Record<string, number | null>>
}

export type ActivityHistoryRecord = {
  id: string
  type: 'sent' | 'received' | 'swap'
  asset: string
  assetId?: string
  amount: string
  to?: string
  from?: string
  accountId?: string
  status: 'pending' | 'confirmed' | 'rejected'
  timestamp: number
  networkId: string
  updatedAt: number
}

type CatalogPlatformRecord = {
  platformId: string
  contractAddress: string
}

type CatalogAssetRecord = {
  id: string
  source: CatalogSource
  updatedAt: number
  geckoId?: string | null
  symbol: string
  name: string
  catalogType: 'native' | 'token'
  hostRuntime?: string | null
  walletRuntimeHint?: string | null
  algorithm?: string | null
  proofType?: string | null
  assetLaunchDate?: string | null
  imageUrl?: string | null
  descriptionPreview?: string | null
  assetPlatforms: CatalogPlatformRecord[]
  ecosystems: string[]
  metadata?: Record<string, unknown>
}

type CatalogNetworkRecord = {
  id: string
  source: CatalogSource
  updatedAt: number
  runtimeFamilyId: string
  walletSupported: boolean
  network: Network
}

type CatalogServerItemRecord = {
  id: string
  source: 'metayoshi-server'
  updatedAt: number
  item: ServerCoinCatalogItem
}

type CatalogMetaRecord = {
  key: string
  value: unknown
}

type CachedAssetSnapshotRecord = {
  id: string
  updatedAt: number
  payload: CachedAssetSnapshot
}

type CachedFiatSnapshotRecord = {
  id: string
  updatedAt: number
  payload: CachedFiatSnapshot
}

type ActivityHistoryStorageRecord = {
  id: string
  accountId: string
  networkId: string
  timestamp: number
  updatedAt: number
  payload: ActivityHistoryRecord
}

export type CatalogServerSnapshot = {
  fetchedAt: number | null
  networks: Network[] | null
  catalog: ServerCoinCatalogItem[]
}

const DB_NAME = 'metayoshi-catalog-db'
const DB_VERSION = 3
const REPOSITORY_DATA_VERSION = 2
const META_STORE = 'meta'
const NETWORK_STORE = 'chainNetworks'
const ASSET_STORE = 'assets'
const SERVER_CATALOG_STORE = 'serverCatalogItems'
const ASSET_CACHE_STORE = 'assetCache'
const FIAT_CACHE_STORE = 'fiatCache'
const ACTIVITY_STORE = 'activityHistory'
const REPOSITORY_DATA_VERSION_KEY = 'repositoryDataVersion'
const LAST_SERVER_SYNC_KEY = 'lastMetayoshiServerSyncAt'
const LAST_PRUNED_AT_KEY = 'lastCatalogRepositoryPrunedAt'
const ASSET_CACHE_TTL_MS = 30 * 60 * 1000
const FIAT_CACHE_TTL_MS = 15 * 60 * 1000
const ACTIVITY_RETENTION_MS = 180 * 24 * 60 * 60 * 1000
const PRUNE_INTERVAL_MS = 6 * 60 * 60 * 1000

let dbPromise: Promise<IDBDatabase | null> | null = null

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined'
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'))
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed'))
    transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted'))
  })
}

function openCatalogDb(): Promise<IDBDatabase | null> {
  if (!hasIndexedDb()) return Promise.resolve(null)
  if (dbPromise) return dbPromise

  dbPromise = new Promise<IDBDatabase | null>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      const metaStore = db.objectStoreNames.contains(META_STORE)
        ? request.transaction!.objectStore(META_STORE)
        : db.createObjectStore(META_STORE, { keyPath: 'key' })
      if (!metaStore.indexNames.contains('byKey')) {
        metaStore.createIndex('byKey', 'key', { unique: true })
      }

      const networkStore = db.objectStoreNames.contains(NETWORK_STORE)
        ? request.transaction!.objectStore(NETWORK_STORE)
        : db.createObjectStore(NETWORK_STORE, { keyPath: 'id' })
      if (!networkStore.indexNames.contains('bySource')) {
        networkStore.createIndex('bySource', 'source', { unique: false })
      }

      const assetStore = db.objectStoreNames.contains(ASSET_STORE)
        ? request.transaction!.objectStore(ASSET_STORE)
        : db.createObjectStore(ASSET_STORE, { keyPath: 'id' })
      if (!assetStore.indexNames.contains('bySource')) {
        assetStore.createIndex('bySource', 'source', { unique: false })
      }
      if (!assetStore.indexNames.contains('bySymbol')) {
        assetStore.createIndex('bySymbol', 'symbol', { unique: false })
      }

      const serverCatalogStore = db.objectStoreNames.contains(SERVER_CATALOG_STORE)
        ? request.transaction!.objectStore(SERVER_CATALOG_STORE)
        : db.createObjectStore(SERVER_CATALOG_STORE, { keyPath: 'id' })
      if (!serverCatalogStore.indexNames.contains('bySource')) {
        serverCatalogStore.createIndex('bySource', 'source', { unique: false })
      }
      if (!serverCatalogStore.indexNames.contains('byAppNetworkId')) {
        serverCatalogStore.createIndex('byAppNetworkId', 'item.appNetworkId', { unique: false })
      }
      if (!serverCatalogStore.indexNames.contains('byRuntimeModelId')) {
        serverCatalogStore.createIndex('byRuntimeModelId', 'item.runtimeModelId', { unique: false })
      }
      if (!serverCatalogStore.indexNames.contains('byWalletCatalogState')) {
        serverCatalogStore.createIndex('byWalletCatalogState', 'item.walletCatalogState', { unique: false })
      }
      if (!serverCatalogStore.indexNames.contains('byCoinId')) {
        serverCatalogStore.createIndex('byCoinId', 'item.coinId', { unique: false })
      }

      const assetCacheStore = db.objectStoreNames.contains(ASSET_CACHE_STORE)
        ? request.transaction!.objectStore(ASSET_CACHE_STORE)
        : db.createObjectStore(ASSET_CACHE_STORE, { keyPath: 'id' })
      if (!assetCacheStore.indexNames.contains('byNetworkId')) {
        assetCacheStore.createIndex('byNetworkId', 'payload.networkId', { unique: false })
      }
      if (!assetCacheStore.indexNames.contains('byAccountId')) {
        assetCacheStore.createIndex('byAccountId', 'payload.accountId', { unique: false })
      }

      const fiatCacheStore = db.objectStoreNames.contains(FIAT_CACHE_STORE)
        ? request.transaction!.objectStore(FIAT_CACHE_STORE)
        : db.createObjectStore(FIAT_CACHE_STORE, { keyPath: 'id' })
      if (!fiatCacheStore.indexNames.contains('byNetworkId')) {
        fiatCacheStore.createIndex('byNetworkId', 'payload.networkId', { unique: false })
      }
      if (!fiatCacheStore.indexNames.contains('byAccountId')) {
        fiatCacheStore.createIndex('byAccountId', 'payload.accountId', { unique: false })
      }

      const activityStore = db.objectStoreNames.contains(ACTIVITY_STORE)
        ? request.transaction!.objectStore(ACTIVITY_STORE)
        : db.createObjectStore(ACTIVITY_STORE, { keyPath: 'id' })
      if (!activityStore.indexNames.contains('byAccountId')) {
        activityStore.createIndex('byAccountId', 'accountId', { unique: false })
      }
      if (!activityStore.indexNames.contains('byNetworkId')) {
        activityStore.createIndex('byNetworkId', 'networkId', { unique: false })
      }
      if (!activityStore.indexNames.contains('byTimestamp')) {
        activityStore.createIndex('byTimestamp', 'timestamp', { unique: false })
      }
    }

    request.onsuccess = () => {
      const db = request.result
      db.onversionchange = () => db.close()
      resolve(db)
    }
    request.onerror = () => reject(request.error || new Error('Failed to open catalog IndexedDB'))
  }).catch((error) => {
    console.warn('Catalog DB disabled:', error)
    dbPromise = null
    return null
  })

  return dbPromise || Promise.resolve(null)
}

function normalizeText(value: unknown): string {
  return String(value || '').trim()
}

function normalizeLower(value: unknown): string {
  return normalizeText(value).toLowerCase()
}

function normalizeUpper(value: unknown): string {
  return normalizeText(value).toUpperCase()
}

function normalizeContract(value: unknown): string {
  return normalizeText(value).toLowerCase()
}

function resolveRuntimeFamilyId(network: Network): string {
  const coinType = normalizeUpper(network.coinType)
  if (coinType === 'EVM') return 'evm'
  if (coinType === 'UTXO' || coinType === 'BTC') return 'utxo'
  if (coinType === 'SOL') return 'solana'
  if (coinType === 'XRP') return 'xrp'
  if (coinType === 'COSMOS') return 'cosmos'
  if (coinType === 'SUI') return 'sui'
  return normalizeLower(network.runtimeModelId || network.id || network.coinType || 'generic') || 'generic'
}

function buildBundledAssetRecord(network: Network, updatedAt: number): CatalogAssetRecord {
  return {
    id: `bundled-native:${normalizeLower(network.id)}`,
    source: 'bundled-registry',
    updatedAt,
    symbol: normalizeUpper(network.symbol),
    name: normalizeText(network.name) || normalizeUpper(network.symbol) || normalizeText(network.id),
    catalogType: 'native',
    hostRuntime: null,
    walletRuntimeHint: normalizeLower(network.runtimeModelId || network.id || network.coinType),
    imageUrl: normalizeText(network.logo) || undefined,
    assetPlatforms: [],
    ecosystems: [],
    metadata: {
      networkId: normalizeText(network.id),
      runtimeModelId: normalizeText(network.runtimeModelId || '') || null,
      coinType: normalizeText(network.coinType),
      explorerUrl: normalizeText(network.explorerUrl || '') || null
    }
  }
}

function buildResearchAssetRecord(asset: ResearchCatalogAsset, updatedAt: number): CatalogAssetRecord {
  return {
    id: `research:${normalizeLower(asset.geckoId) || normalizeLower(asset.symbol)}`,
    source: 'research-top100',
    updatedAt,
    geckoId: normalizeLower(asset.geckoId) || null,
    symbol: normalizeUpper(asset.symbol),
    name: normalizeText(asset.name) || normalizeUpper(asset.symbol),
    catalogType: asset.catalogType === 'native' ? 'native' : 'token',
    hostRuntime: normalizeText(asset.hostRuntime || '') || null,
    walletRuntimeHint: normalizeText(asset.walletRuntimeHint || '') || null,
    algorithm: normalizeText(asset.algorithm || '') || null,
    proofType: normalizeText(asset.proofType || '') || null,
    assetLaunchDate: normalizeText(asset.assetLaunchDate || '') || null,
    imageUrl: normalizeText(asset.imageUrl || '') || null,
    descriptionPreview: normalizeText(asset.descriptionPreview || '') || null,
    assetPlatforms: Array.isArray(asset.assetPlatforms)
      ? asset.assetPlatforms
        .map((platform) => ({
          platformId: normalizeLower(platform.platformId),
          contractAddress: normalizeText(platform.contractAddress)
        }))
        .filter((platform) => platform.platformId && platform.contractAddress)
      : [],
    ecosystems: Array.isArray(asset.segments)
      ? asset.segments.map((entry) => normalizeLower(entry)).filter(Boolean)
      : [],
    metadata: {
      rank: asset.rank,
      taxonomy: asset.taxonomy || null,
      source: asset.source || null
    }
  }
}

function buildNetworkRecord(network: Network, source: CatalogSource, updatedAt: number): CatalogNetworkRecord {
  return {
    id: normalizeText(network.id),
    source,
    updatedAt,
    runtimeFamilyId: resolveRuntimeFamilyId(network),
    walletSupported: true,
    network
  }
}

function buildServerCatalogRecordId(item: ServerCoinCatalogItem): string {
  return [
    normalizeLower(item.coinId),
    normalizeLower(item.appNetworkId),
    normalizeLower(item.walletCatalogState),
    normalizeLower(item.kind),
    normalizeLower(item.chain),
    normalizeContract(item.contractAddress)
  ].join('::')
}

function buildScopeKey(accountId: string, networkId: string, address: string): string {
  return [
    normalizeLower(accountId),
    normalizeLower(networkId),
    normalizeLower(address)
  ].join('::')
}

function normalizeEvmAddressLoose(value: string): string {
  const raw = normalizeText(value)
  if (!/^0x[a-f0-9]{40}$/i.test(raw)) return ''
  return raw.toLowerCase()
}

function buildActivityStorageId(activity: Pick<ActivityHistoryRecord, 'id' | 'networkId' | 'accountId' | 'assetId' | 'asset'>): string {
  const assetKey = normalizeActivityAssetId(String(activity.assetId || '').trim(), activity.networkId)
    || normalizeText(activity.asset || '').toLowerCase()
  return [
    normalizeLower(activity.networkId),
    normalizeLower(activity.accountId || ''),
    assetKey,
    normalizeLower(activity.id)
  ].join('::')
}

async function clearStoreBySource(store: IDBObjectStore, source: CatalogSource): Promise<void> {
  const index = store.index('bySource')
  const keys = await requestToPromise(index.getAllKeys(source))
  for (const key of keys) {
    store.delete(key)
  }
}

async function clearStore(store: IDBObjectStore): Promise<void> {
  await requestToPromise(store.clear())
}

async function pruneAssetCacheStore(store: IDBObjectStore, now: number): Promise<void> {
  const rows = await readAllFromStore<CachedAssetSnapshotRecord>(store)
  for (const row of rows) {
    const fetchedAt = Number(row?.payload?.fetchedAt || row?.updatedAt || 0)
    if (!Number.isFinite(fetchedAt) || fetchedAt <= 0 || now - fetchedAt > ASSET_CACHE_TTL_MS) {
      store.delete(row.id)
    }
  }
}

async function pruneFiatCacheStore(store: IDBObjectStore, now: number): Promise<void> {
  const rows = await readAllFromStore<CachedFiatSnapshotRecord>(store)
  for (const row of rows) {
    const fetchedAt = Number(row?.payload?.fetchedAt || row?.updatedAt || 0)
    if (!Number.isFinite(fetchedAt) || fetchedAt <= 0 || now - fetchedAt > FIAT_CACHE_TTL_MS) {
      store.delete(row.id)
    }
  }
}

async function pruneActivityStore(store: IDBObjectStore, now: number): Promise<void> {
  const rows = await readAllFromStore<ActivityHistoryStorageRecord>(store)
  for (const row of rows) {
    const timestamp = Number(row?.payload?.timestamp || row?.timestamp || 0)
    if (!Number.isFinite(timestamp) || timestamp <= 0 || now - timestamp > ACTIVITY_RETENTION_MS) {
      store.delete(row.id)
    }
  }
}

async function runRepositoryDataMigrations(db: IDBDatabase): Promise<void> {
  const transaction = db.transaction([META_STORE, ASSET_CACHE_STORE, FIAT_CACHE_STORE, ACTIVITY_STORE], 'readwrite')
  const metaStore = transaction.objectStore(META_STORE)
  const assetCacheStore = transaction.objectStore(ASSET_CACHE_STORE)
  const fiatCacheStore = transaction.objectStore(FIAT_CACHE_STORE)
  const activityStore = transaction.objectStore(ACTIVITY_STORE)
  const currentVersionRecord = await requestToPromise(
    metaStore.get(REPOSITORY_DATA_VERSION_KEY)
  ) as CatalogMetaRecord | undefined
  const currentVersion = Number(currentVersionRecord?.value || 0)

  if (currentVersion !== REPOSITORY_DATA_VERSION) {
    await Promise.all([
      clearStore(assetCacheStore),
      clearStore(fiatCacheStore),
      clearStore(activityStore)
    ])
    metaStore.put({ key: REPOSITORY_DATA_VERSION_KEY, value: REPOSITORY_DATA_VERSION } satisfies CatalogMetaRecord)
    metaStore.put({ key: LAST_PRUNED_AT_KEY, value: Date.now() } satisfies CatalogMetaRecord)
  }

  await transactionDone(transaction)
}

async function pruneRepositoryData(db: IDBDatabase): Promise<void> {
  const now = Date.now()
  const readTransaction = db.transaction(META_STORE, 'readonly')
  const lastPrunedRecord = await requestToPromise(
    readTransaction.objectStore(META_STORE).get(LAST_PRUNED_AT_KEY)
  ) as CatalogMetaRecord | undefined
  const lastPrunedAt = Number(lastPrunedRecord?.value || 0)
  if (Number.isFinite(lastPrunedAt) && lastPrunedAt > 0 && now - lastPrunedAt < PRUNE_INTERVAL_MS) {
    return
  }

  const transaction = db.transaction([META_STORE, ASSET_CACHE_STORE, FIAT_CACHE_STORE, ACTIVITY_STORE], 'readwrite')
  await Promise.all([
    pruneAssetCacheStore(transaction.objectStore(ASSET_CACHE_STORE), now),
    pruneFiatCacheStore(transaction.objectStore(FIAT_CACHE_STORE), now),
    pruneActivityStore(transaction.objectStore(ACTIVITY_STORE), now)
  ])
  transaction.objectStore(META_STORE).put({
    key: LAST_PRUNED_AT_KEY,
    value: now
  } satisfies CatalogMetaRecord)
  await transactionDone(transaction)
}

async function seedStaticCatalogData(input: { bundledNetworks: Network[] }): Promise<void> {
  const db = await openCatalogDb()
  if (!db) return

  const transaction = db.transaction([NETWORK_STORE, ASSET_STORE], 'readwrite')
  const networkStore = transaction.objectStore(NETWORK_STORE)
  const assetStore = transaction.objectStore(ASSET_STORE)
  const updatedAt = Date.now()

  await clearStoreBySource(networkStore, 'bundled-registry')
  await clearStoreBySource(assetStore, 'bundled-registry')
  await clearStoreBySource(assetStore, 'research-top100')

  for (const network of input.bundledNetworks) {
    networkStore.put(buildNetworkRecord(network, 'bundled-registry', updatedAt))
    assetStore.put(buildBundledAssetRecord(network, updatedAt))
  }

  for (const asset of RESEARCH_TOP100_CATALOG_SNAPSHOT.assets) {
    assetStore.put(buildResearchAssetRecord(asset, updatedAt))
  }

  await transactionDone(transaction)
}

function buildEnrichmentIndexes(assetRecords: CatalogAssetRecord[]): {
  byContract: Map<string, CatalogAssetRecord>
  byUniqueSymbol: Map<string, CatalogAssetRecord>
  byNameAndSymbol: Map<string, CatalogAssetRecord>
} {
  const byContract = new Map<string, CatalogAssetRecord>()
  const byUniqueSymbol = new Map<string, CatalogAssetRecord>()
  const byNameAndSymbol = new Map<string, CatalogAssetRecord>()
  const symbolGroups = new Map<string, CatalogAssetRecord[]>()

  for (const asset of assetRecords) {
    if (asset.source !== 'research-top100') continue

    const symbol = normalizeUpper(asset.symbol)
    if (symbol) {
      const existing = symbolGroups.get(symbol) || []
      existing.push(asset)
      symbolGroups.set(symbol, existing)
    }

    const nameAndSymbolKey = `${normalizeLower(asset.name)}::${symbol}`
    if (normalizeLower(asset.name) && symbol && !byNameAndSymbol.has(nameAndSymbolKey)) {
      byNameAndSymbol.set(nameAndSymbolKey, asset)
    }

    for (const platform of asset.assetPlatforms) {
      const contract = normalizeContract(platform.contractAddress)
      if (!contract) continue
      if (!byContract.has(contract)) {
        byContract.set(contract, asset)
      }
    }
  }

  for (const [symbol, rows] of symbolGroups.entries()) {
    if (rows.length === 1) byUniqueSymbol.set(symbol, rows[0])
  }

  return { byContract, byUniqueSymbol, byNameAndSymbol }
}

function enrichServerCatalogItem(
  item: ServerCoinCatalogItem,
  indexes: ReturnType<typeof buildEnrichmentIndexes>
): ServerCoinCatalogItem {
  const contract = normalizeContract(item.contractAddress)
  const symbol = normalizeUpper(item.symbol)
  const nameKey = `${normalizeLower(item.name)}::${symbol}`
  const matchedAsset = (
    (contract ? indexes.byContract.get(contract) : undefined)
    || indexes.byNameAndSymbol.get(nameKey)
    || indexes.byUniqueSymbol.get(symbol)
  )

  if (!matchedAsset) {
    return {
      ...item,
      source: 'metayoshi-server'
    }
  }

  return {
    ...item,
    source: 'metayoshi-server',
    logoUrl: item.logoUrl || matchedAsset.imageUrl || undefined,
    hostRuntime: item.hostRuntime ?? matchedAsset.hostRuntime ?? null,
    walletRuntimeHint: item.walletRuntimeHint ?? matchedAsset.walletRuntimeHint ?? null,
    algorithm: item.algorithm ?? matchedAsset.algorithm ?? null,
    proofType: item.proofType ?? matchedAsset.proofType ?? null,
    metadata: {
      ...(item.metadata || {}),
      researchAssetId: matchedAsset.id,
      researchGeckoId: matchedAsset.geckoId || null,
      researchCatalogType: matchedAsset.catalogType,
      researchAssetLaunchDate: matchedAsset.assetLaunchDate || null,
      researchDescriptionPreview: matchedAsset.descriptionPreview || null,
      ecosystems: matchedAsset.ecosystems,
      assetPlatforms: matchedAsset.assetPlatforms
    }
  }
}

async function readAllFromStore<T>(store: IDBObjectStore): Promise<T[]> {
  const rows = await requestToPromise(store.getAll())
  return Array.isArray(rows) ? (rows as T[]) : []
}

function toCatalogModelAssetRow(item: ServerCoinCatalogItem): CatalogModelAssetRow {
  return {
    coinId: normalizeText(item.coinId),
    name: normalizeText(item.name) || normalizeText(item.coinId),
    symbol: normalizeUpper(item.symbol) || 'ASSET',
    kind: item.kind === 'main' ? 'main' : 'asset',
    contractAddress: normalizeText(item.contractAddress) || undefined,
    logoUrl: normalizeText(item.logoUrl) || undefined
  }
}

function isWalletActiveCatalogItem(item: ServerCoinCatalogItem): boolean {
  return normalizeLower(item.walletCatalogState) === 'active'
}

export async function initializeCatalogRepository(input: {
  bundledNetworks: Network[]
  legacyServerSnapshot?: {
    networks: Network[] | null
    catalog: ServerCoinCatalogItem[]
  } | null
}): Promise<void> {
  const db = await openCatalogDb()
  if (!db) return

  try {
    await runRepositoryDataMigrations(db)
    await seedStaticCatalogData({ bundledNetworks: input.bundledNetworks })
    if (input.legacyServerSnapshot) {
      const hasLegacyCatalog = (input.legacyServerSnapshot.catalog || []).length > 0
      const hasLegacyNetworks = (input.legacyServerSnapshot.networks || []).length > 0
      if (hasLegacyCatalog || hasLegacyNetworks) {
        await cacheMetayoshiServerCatalogSnapshot(input.legacyServerSnapshot)
      }
    }
    await pruneRepositoryData(db)
  } catch (error) {
    console.warn('Failed to initialize catalog repository:', error)
  }
}

export async function resetCatalogRepositoryForTesting(): Promise<void> {
  const existingDb = await openCatalogDb().catch(() => null)
  if (existingDb) existingDb.close()
  dbPromise = null

  if (!hasIndexedDb()) return

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error || new Error('Failed to delete catalog DB'))
    request.onblocked = () => resolve()
  }).catch((error) => {
    console.warn('Failed to reset catalog repository:', error)
  })
}

export async function cacheMetayoshiServerCatalogSnapshot(input: {
  networks: Network[] | null
  catalog: ServerCoinCatalogItem[]
}): Promise<void> {
  const db = await openCatalogDb()
  if (!db) return

  const transaction = db.transaction([META_STORE, NETWORK_STORE, SERVER_CATALOG_STORE], 'readwrite')
  const metaStore = transaction.objectStore(META_STORE)
  const networkStore = transaction.objectStore(NETWORK_STORE)
  const serverCatalogStore = transaction.objectStore(SERVER_CATALOG_STORE)
  const updatedAt = Date.now()

  await clearStoreBySource(networkStore, 'metayoshi-server')
  await clearStoreBySource(serverCatalogStore, 'metayoshi-server')

  for (const network of input.networks || []) {
    networkStore.put(buildNetworkRecord(network, 'metayoshi-server', updatedAt))
  }

  for (const item of input.catalog || []) {
    const normalizedItem: ServerCoinCatalogItem = {
      ...item,
      source: 'metayoshi-server'
    }
    const record: CatalogServerItemRecord = {
      id: buildServerCatalogRecordId(normalizedItem),
      source: 'metayoshi-server',
      updatedAt,
      item: normalizedItem
    }
    serverCatalogStore.put(record)
  }

  const metaRecord: CatalogMetaRecord = {
    key: LAST_SERVER_SYNC_KEY,
    value: updatedAt
  }
  metaStore.put(metaRecord)
  await transactionDone(transaction)
}

export async function readCachedMetayoshiServerCatalogSnapshot(): Promise<CatalogServerSnapshot | null> {
  try {
    const db = await openCatalogDb()
    if (!db) return null

    const transaction = db.transaction([META_STORE, NETWORK_STORE, ASSET_STORE, SERVER_CATALOG_STORE], 'readonly')
    const metaStore = transaction.objectStore(META_STORE)
    const networkStore = transaction.objectStore(NETWORK_STORE)
    const assetStore = transaction.objectStore(ASSET_STORE)
    const serverCatalogStore = transaction.objectStore(SERVER_CATALOG_STORE)

    const [lastSyncRecord, allNetworks, allAssets, serverItems] = await Promise.all([
      requestToPromise(metaStore.get(LAST_SERVER_SYNC_KEY)),
      requestToPromise(networkStore.index('bySource').getAll('metayoshi-server')),
      readAllFromStore<CatalogAssetRecord>(assetStore),
      readAllFromStore<CatalogServerItemRecord>(serverCatalogStore)
    ])

    const networks = (Array.isArray(allNetworks) ? (allNetworks as CatalogNetworkRecord[]) : [])
      .map((record) => record.network)
    const assetRecords = Array.isArray(allAssets) ? (allAssets as CatalogAssetRecord[]) : []
    const indexes = buildEnrichmentIndexes(assetRecords)
    const catalog = (Array.isArray(serverItems) ? (serverItems as CatalogServerItemRecord[]) : [])
      .map((record) => enrichServerCatalogItem(record.item, indexes))

    if (catalog.length === 0 && networks.length === 0) return null

    return {
      fetchedAt: typeof (lastSyncRecord as CatalogMetaRecord | undefined)?.value === 'number'
        ? ((lastSyncRecord as CatalogMetaRecord).value as number)
        : null,
      networks: networks.length > 0 ? networks : null,
      catalog
    }
  } catch (error) {
    console.warn('Failed to read cached catalog DB snapshot:', error)
    return null
  }
}

export async function readCatalogModelSummary(modelId: string): Promise<CatalogModelSummary> {
  const normalizedModelId = normalizeLower(modelId)
  if (!normalizedModelId) {
    return {
      modelId: '',
      mainCount: 0,
      assetCount: 0,
      assetRows: []
    }
  }

  const db = await openCatalogDb()
  if (!db) {
    return {
      modelId: normalizedModelId,
      mainCount: 0,
      assetCount: 0,
      assetRows: []
    }
  }

  const transaction = db.transaction(SERVER_CATALOG_STORE, 'readonly')
  const store = transaction.objectStore(SERVER_CATALOG_STORE)
  const rows = await readAllFromStore<CatalogServerItemRecord>(store)
  const matching = rows
    .map((row) => row.item)
    .filter((item) => isWalletActiveCatalogItem(item))
    .filter((item) => normalizeLower(item.runtimeModelId) === normalizedModelId)
    .map(toCatalogModelAssetRow)

  const assetRows = matching.filter((row) => row.kind === 'asset')
  return {
    modelId: normalizedModelId,
    mainCount: matching.filter((row) => row.kind === 'main').length,
    assetCount: assetRows.length,
    assetRows: assetRows.sort((left, right) => {
      const nameCompare = left.name.localeCompare(right.name)
      if (nameCompare !== 0) return nameCompare
      return left.coinId.localeCompare(right.coinId)
    })
  }
}

function resolveCatalogEvmLookupKeys(input: string | { modelId?: string | null; networkId?: string | null }): Set<string> {
  const out = new Set<string>()
  const add = (value: string | null | undefined) => {
    const normalized = normalizeLower(value)
    if (!normalized) return
    out.add(normalized)
    if (normalized === 'bnb') out.add('bsc')
    if (normalized === 'bsc') out.add('bnb')
    if (normalized === 'bnb-testnet' || normalized === 'bsc-testnet') {
      out.add('bnb-testnet')
      out.add('bsc-testnet')
      out.add('bnb')
      out.add('bsc')
    }
  }

  if (typeof input === 'string') {
    add(input)
  } else {
    add(input?.modelId)
    add(input?.networkId)
  }

  return out
}

function matchesCatalogEvmLookup(
  item: Pick<ServerCoinCatalogItem, 'runtimeModelId' | 'appNetworkId'>,
  lookupKeys: Set<string>
): boolean {
  if (lookupKeys.size === 0) return false
  return lookupKeys.has(normalizeLower(item.runtimeModelId)) || lookupKeys.has(normalizeLower(item.appNetworkId))
}

export async function readCatalogTrackedEvmTokens(
  input: string | { modelId?: string | null; networkId?: string | null }
): Promise<CatalogTrackedEvmToken[]> {
  const lookupKeys = resolveCatalogEvmLookupKeys(input)
  if (lookupKeys.size === 0) return []

  const db = await openCatalogDb()
  if (!db) return []

  const transaction = db.transaction(SERVER_CATALOG_STORE, 'readonly')
  const store = transaction.objectStore(SERVER_CATALOG_STORE)
  const rows = await readAllFromStore<CatalogServerItemRecord>(store)
  const byAddress = new Map<string, CatalogTrackedEvmToken>()

  for (const row of rows) {
    const item = row.item
    if (item.kind !== 'asset') continue
    if (!isWalletActiveCatalogItem(item)) continue
    if (!matchesCatalogEvmLookup(item, lookupKeys)) continue
    const address = normalizeEvmAddressLoose(String(item.contractAddress || ''))
    if (!address || byAddress.has(address)) continue
    byAddress.set(address, {
      address,
      symbol: normalizeUpper(item.symbol) || address.slice(0, 6),
      decimals: 18,
      logoUri: normalizeText(item.logoUrl) || undefined
    })
  }

  return [...byAddress.values()]
}

export async function readCatalogTrackedEvmNfts(
  input: string | { modelId?: string | null; networkId?: string | null }
): Promise<CatalogTrackedEvmNft[]> {
  const lookupKeys = resolveCatalogEvmLookupKeys(input)
  if (lookupKeys.size === 0) return []

  const db = await openCatalogDb()
  if (!db) return []

  const transaction = db.transaction(SERVER_CATALOG_STORE, 'readonly')
  const store = transaction.objectStore(SERVER_CATALOG_STORE)
  const rows = await readAllFromStore<CatalogServerItemRecord>(store)
  const out: CatalogTrackedEvmNft[] = []
  const seen = new Set<string>()

  for (const row of rows) {
    const item = row.item
    if (item.kind !== 'asset') continue
    if (!isWalletActiveCatalogItem(item)) continue
    if (!matchesCatalogEvmLookup(item, lookupKeys)) continue
    const address = normalizeEvmAddressLoose(String(item.contractAddress || ''))
    if (!address) continue

    const source = `${normalizeText(item.coinId)} ${normalizeText(item.name)}`
    const tokenIdMatch =
      source.match(/(?:tokenid|token|id)\D*(0x[0-9a-f]+|\d+)/i)
      || source.match(/[#:/](0x[0-9a-f]+|\d+)/i)
    const tokenId = normalizeText(tokenIdMatch?.[1])
    if (!tokenId) continue

    const standard: CatalogTrackedEvmNft['standard'] = /1155/i.test(source)
      ? 'erc1155'
      : /721/i.test(source)
        ? 'erc721'
        : 'auto'
    const key = `${address}:${tokenId.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      address,
      tokenId,
      standard,
      label: normalizeText(item.symbol || item.name) || undefined
    })
  }

  return out
}

export async function searchMetayoshiServerCatalogAssets(
  input: CatalogServerAssetSearchInput
): Promise<ServerCoinCatalogItem[]> {
  const db = await openCatalogDb()
  if (!db) return []

  const normalizedQuery = normalizeLower(input.query)
  const normalizedNetworkId = normalizeLower(input.networkId)
  const normalizedRuntimeModelId = normalizeLower(input.runtimeModelId)
  const includeMain = input.includeMain === true
  const maxResults = Math.max(1, Math.min(50, Math.trunc(Number(input.maxResults) || 12)))

  const transaction = db.transaction(SERVER_CATALOG_STORE, 'readonly')
  const rows = await readAllFromStore<CatalogServerItemRecord>(transaction.objectStore(SERVER_CATALOG_STORE))
  const seen = new Set<string>()

  const scored = rows
    .map((row) => row.item)
    .filter((item) => normalizeLower(item.walletCatalogState) !== 'blocked')
    .filter((item) => includeMain || item.kind === 'asset')
    .filter((item) => {
      if (!normalizedNetworkId && !normalizedRuntimeModelId) return true
      if (normalizedNetworkId && normalizeLower(item.appNetworkId) === normalizedNetworkId) return true
      if (normalizedRuntimeModelId && normalizeLower(item.runtimeModelId) === normalizedRuntimeModelId) return true
      return false
    })
    .map((item) => {
      const symbol = normalizeUpper(item.symbol)
      const name = normalizeText(item.name)
      const coinId = normalizeLower(item.coinId)
      const contractAddress = normalizeContract(item.contractAddress)
      const label = `${symbol} ${name} ${coinId} ${contractAddress}`.trim().toLowerCase()
      if (normalizedQuery && !label.includes(normalizedQuery)) return null

      let score = 0
      if (normalizeLower(item.walletCatalogState) === 'active') score += 40
      if (normalizeLower(item.kind) === 'main') score += 12
      if (normalizedQuery) {
        if (symbol.toLowerCase() === normalizedQuery) score += 80
        else if (symbol.toLowerCase().startsWith(normalizedQuery)) score += 55
        if (name.toLowerCase() === normalizedQuery) score += 45
        else if (name.toLowerCase().startsWith(normalizedQuery)) score += 28
        if (coinId === normalizedQuery) score += 30
        if (contractAddress && contractAddress === normalizedQuery) score += 90
      }

      return { item, score }
    })
    .filter((row): row is { item: ServerCoinCatalogItem, score: number } => Boolean(row))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score
      if (left.item.kind !== right.item.kind) return left.item.kind === 'main' ? -1 : 1
      return `${left.item.symbol}|${left.item.name}|${left.item.coinId}`.localeCompare(
        `${right.item.symbol}|${right.item.name}|${right.item.coinId}`
      )
    })

  const out: ServerCoinCatalogItem[] = []
  for (const row of scored) {
    const dedupeKey = [
      normalizeLower(row.item.appNetworkId),
      normalizeLower(row.item.coinId),
      normalizeContract(row.item.contractAddress),
      normalizeLower(row.item.kind)
    ].join('::')
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    out.push(row.item)
    if (out.length >= maxResults) break
  }

  return out
}

export async function writeCachedAssetSnapshot(snapshot: CachedAssetSnapshot): Promise<void> {
  const db = await openCatalogDb()
  if (!db) return

  const record: CachedAssetSnapshotRecord = {
    id: buildScopeKey(snapshot.accountId, snapshot.networkId, snapshot.address),
    updatedAt: Date.now(),
    payload: snapshot
  }
  const transaction = db.transaction(ASSET_CACHE_STORE, 'readwrite')
  transaction.objectStore(ASSET_CACHE_STORE).put(record)
  await transactionDone(transaction)
}

export async function readCachedAssetSnapshot(input: {
  accountId: string
  networkId: string
  address: string
}): Promise<CachedAssetSnapshot | null> {
  const db = await openCatalogDb()
  if (!db) return null

  const transaction = db.transaction(ASSET_CACHE_STORE, 'readonly')
  const record = await requestToPromise(
    transaction.objectStore(ASSET_CACHE_STORE).get(buildScopeKey(input.accountId, input.networkId, input.address))
  ) as CachedAssetSnapshotRecord | undefined
  const fetchedAt = Number(record?.payload?.fetchedAt || record?.updatedAt || 0)
  if (record && (!Number.isFinite(fetchedAt) || fetchedAt <= 0 || Date.now() - fetchedAt > ASSET_CACHE_TTL_MS)) {
    void (async () => {
      const cleanupDb = await openCatalogDb()
      if (!cleanupDb) return
      const cleanupTx = cleanupDb.transaction(ASSET_CACHE_STORE, 'readwrite')
      cleanupTx.objectStore(ASSET_CACHE_STORE).delete(record.id)
      await transactionDone(cleanupTx)
    })().catch(() => {})
    return null
  }
  return record?.payload || null
}

export async function writeCachedFiatSnapshot(snapshot: CachedFiatSnapshot): Promise<void> {
  const db = await openCatalogDb()
  if (!db) return

  const record: CachedFiatSnapshotRecord = {
    id: buildScopeKey(snapshot.accountId, snapshot.networkId, snapshot.address),
    updatedAt: Date.now(),
    payload: snapshot
  }
  const transaction = db.transaction(FIAT_CACHE_STORE, 'readwrite')
  transaction.objectStore(FIAT_CACHE_STORE).put(record)
  await transactionDone(transaction)
}

export async function readCachedFiatSnapshot(input: {
  accountId: string
  networkId: string
  address: string
}): Promise<CachedFiatSnapshot | null> {
  const db = await openCatalogDb()
  if (!db) return null

  const transaction = db.transaction(FIAT_CACHE_STORE, 'readonly')
  const record = await requestToPromise(
    transaction.objectStore(FIAT_CACHE_STORE).get(buildScopeKey(input.accountId, input.networkId, input.address))
  ) as CachedFiatSnapshotRecord | undefined
  const fetchedAt = Number(record?.payload?.fetchedAt || record?.updatedAt || 0)
  if (record && (!Number.isFinite(fetchedAt) || fetchedAt <= 0 || Date.now() - fetchedAt > FIAT_CACHE_TTL_MS)) {
    void (async () => {
      const cleanupDb = await openCatalogDb()
      if (!cleanupDb) return
      const cleanupTx = cleanupDb.transaction(FIAT_CACHE_STORE, 'readwrite')
      cleanupTx.objectStore(FIAT_CACHE_STORE).delete(record.id)
      await transactionDone(cleanupTx)
    })().catch(() => {})
    return null
  }
  return record?.payload || null
}

export async function upsertActivityHistoryRecord(activity: Omit<ActivityHistoryRecord, 'updatedAt'>): Promise<void> {
  const db = await openCatalogDb()
  if (!db) return

  const payload: ActivityHistoryRecord = {
    ...activity,
    updatedAt: Date.now()
  }
  const record: ActivityHistoryStorageRecord = {
    id: buildActivityStorageId(payload),
    accountId: normalizeText(payload.accountId || ''),
    networkId: normalizeText(payload.networkId),
    timestamp: Number(payload.timestamp) || Date.now(),
    updatedAt: payload.updatedAt,
    payload
  }
  const transaction = db.transaction(ACTIVITY_STORE, 'readwrite')
  transaction.objectStore(ACTIVITY_STORE).put(record)
  await transactionDone(transaction)
}

export async function readActivityHistoryRecords(): Promise<ActivityHistoryRecord[]> {
  const db = await openCatalogDb()
  if (!db) return []

  const transaction = db.transaction(ACTIVITY_STORE, 'readonly')
  const rows = await readAllFromStore<ActivityHistoryStorageRecord>(transaction.objectStore(ACTIVITY_STORE))
  return rows
    .map((row) => row.payload)
    .filter((row) => {
      const timestamp = Number(row?.timestamp || 0)
      return Number.isFinite(timestamp) && timestamp > 0 && Date.now() - timestamp <= ACTIVITY_RETENTION_MS
    })
    .sort((left, right) => Number(right.timestamp || 0) - Number(left.timestamp || 0))
}
