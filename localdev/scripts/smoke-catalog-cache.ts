import 'fake-indexeddb/auto'
import {
  cacheMetayoshiServerCatalogSnapshot,
  initializeCatalogRepository,
  readActivityHistoryRecords,
  readCachedAssetSnapshot,
  readCachedFiatSnapshot,
  readCachedMetayoshiServerCatalogSnapshot,
  readCatalogModelSummary,
  resetCatalogRepositoryForTesting,
  upsertActivityHistoryRecord,
  writeCachedAssetSnapshot,
  writeCachedFiatSnapshot
} from '../src/lib/catalogDb/repository'
import type { Network } from '../src/coins'
import type { ServerCoinCatalogItem } from '../src/coins'

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message)
}

function createBundledNetworks(): Network[] {
  return [
    {
      id: 'eth',
      runtimeModelId: 'eth',
      name: 'Ethereum',
      symbol: 'ETH',
      coinType: 'EVM',
      chainId: 1,
      rpcUrl: 'https://rpc.example.invalid',
      explorerUrl: 'https://etherscan.io',
      capabilities: {
        features: { nativeSend: true, assetLayer: true, assetSend: true, activity: true },
        ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
      }
    },
    {
      id: 'rtm',
      runtimeModelId: 'rtm',
      name: 'Raptoreum',
      symbol: 'RTM',
      coinType: 'UTXO',
      rpcUrl: 'https://rpc.example.invalid',
      coinSymbol: 'RTM',
      feePerByte: 0.0000002,
      capabilities: {
        features: { nativeSend: true, assetLayer: true, assetSend: true, activity: true },
        ui: { showAssetsTab: true, showAssetsAction: true, showSendAction: true, showActivityTab: true }
      }
    }
  ]
}

function createServerCatalog(): ServerCoinCatalogItem[] {
  return [
    {
      coinId: 'ethereum',
      name: 'Ethereum',
      symbol: 'ETH',
      kind: 'main',
      runtimeModelId: 'eth',
      appNetworkId: 'eth',
      chain: 'main',
      enabled: true,
      bridgeImplemented: true,
      capabilities: {
        rpcBridge: true,
        sync: true,
        balance: true,
        assets: true,
        history: true,
        send: true,
        broadcast: true
      },
      walletCatalogState: 'active',
      catalogProfile: {
        policy: 'enabled',
        transport: 'wallet-bridge',
        capabilitySummary: 'Y/Y/Y/Y/Y/Y/Y',
        description: 'Ethereum wallet bridge',
        operationalModel: 'evm-account',
        connectionProviders: ['publicnode'],
        rpcUrls: ['https://ethereum-rpc.publicnode.com'],
        rpcWallets: [],
        apiRoutes: {
          bridge: '/v1/bridge/ethereum/main',
          sendCoin: '/v1/bridge/send/coin/ethereum/main',
          sendAsset: '/v1/bridge/send/asset/ethereum/main'
        },
        tokenStandards: ['erc20'],
        nftStandards: ['erc721', 'erc1155'],
        assetStandards: ['erc20', 'erc721', 'erc1155']
      },
      source: 'metayoshi-server'
    },
    {
      coinId: 'tether',
      name: 'Tether USD',
      symbol: 'USDT',
      kind: 'asset',
      contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      runtimeModelId: 'eth',
      appNetworkId: 'eth',
      chain: 'main',
      enabled: true,
      bridgeImplemented: true,
      capabilities: {
        rpcBridge: true,
        sync: true,
        balance: true,
        assets: true,
        history: true,
        send: true,
        broadcast: true
      },
      walletCatalogState: 'active',
      catalogProfile: {
        policy: 'enabled',
        transport: 'wallet-bridge',
        capabilitySummary: 'Y/Y/Y/Y/Y/Y/Y',
        description: 'Tether USD tracked token',
        operationalModel: 'evm-account',
        connectionProviders: [],
        rpcUrls: [],
        rpcWallets: [],
        apiRoutes: {
          bridge: '/v1/bridge/tether/main',
          sendCoin: '/v1/bridge/send/coin/tether/main',
          sendAsset: '/v1/bridge/send/asset/tether/main'
        },
        tokenStandards: ['erc20'],
        nftStandards: [],
        assetStandards: ['erc20']
      },
      source: 'metayoshi-server'
    },
    {
      coinId: 'arr',
      name: 'ARR',
      symbol: 'ARR',
      kind: 'main',
      runtimeModelId: 'arr',
      appNetworkId: null,
      chain: 'main',
      enabled: true,
      bridgeImplemented: false,
      capabilities: {
        rpcBridge: false,
        sync: false,
        balance: false,
        assets: false,
        history: false,
        send: false,
        broadcast: false
      },
      walletCatalogState: 'catalog-only',
      catalogProfile: {
        policy: 'enabled',
        transport: 'registry-only',
        capabilitySummary: 'N/N/N/N/N/N/N',
        description: 'Catalog-only ARR entry',
        operationalModel: 'catalog-registry',
        connectionProviders: [],
        rpcUrls: [],
        rpcWallets: [],
        apiRoutes: {},
        tokenStandards: [],
        nftStandards: [],
        assetStandards: []
      },
      source: 'metayoshi-server'
    }
  ]
}

async function runOfflinePopupOpenScenario(): Promise<void> {
  await resetCatalogRepositoryForTesting()
  await initializeCatalogRepository({
    bundledNetworks: createBundledNetworks()
  })

  const cachedSnapshot = await readCachedMetayoshiServerCatalogSnapshot()
  const summary = await readCatalogModelSummary('eth')

  assert(cachedSnapshot === null, 'offline bootstrap should not fabricate a server snapshot')
  assert(summary.modelId === 'eth', 'catalog summary should still resolve the requested model id')
  assert(Array.isArray(summary.assetRows) && summary.assetRows.length === 0, 'offline bootstrap should start with an empty server asset catalog')
}

async function runServerDownStartupScenario(): Promise<void> {
  await resetCatalogRepositoryForTesting()
  await initializeCatalogRepository({
    bundledNetworks: createBundledNetworks()
  })

  const serverNetworks = createBundledNetworks().slice(0, 1)
  const serverCatalog = createServerCatalog()
  await cacheMetayoshiServerCatalogSnapshot({
    networks: serverNetworks,
    catalog: serverCatalog
  })

  const cachedSnapshot = await readCachedMetayoshiServerCatalogSnapshot()
  const summary = await readCatalogModelSummary('eth')

  assert(cachedSnapshot !== null, 'cached server snapshot should be readable after a successful sync')
  assert((cachedSnapshot?.catalog || []).length === serverCatalog.length, 'cached server catalog should retain metayoshi server rows')
  assert(
    cachedSnapshot?.catalog?.some((row) => row.coinId === 'arr' && row.walletCatalogState === 'catalog-only'),
    'cached server catalog should preserve catalog-only rows'
  )
  assert(summary.assetCount === 1, 'typed model summary should expose the cached token row')
  assert(summary.assetRows[0]?.symbol === 'USDT', 'typed model summary should expose the expected token symbol')
}

async function runRepositoryReplayScenario(): Promise<void> {
  await resetCatalogRepositoryForTesting()
  await initializeCatalogRepository({
    bundledNetworks: createBundledNetworks()
  })

  await writeCachedAssetSnapshot({
    accountId: 'acc-1',
    networkId: 'eth',
    address: '0x1111111111111111111111111111111111111111',
    fetchedAt: Date.now(),
    assets: { USDT: 123450000 },
    logos: { USDT: 'https://cdn.example.invalid/usdt.png' },
    labels: { USDT: 'Tether USD' },
    evmNfts: {}
  })
  await writeCachedFiatSnapshot({
    accountId: 'acc-1',
    networkId: 'eth',
    address: '0x1111111111111111111111111111111111111111',
    fetchedAt: Date.now(),
    totals: { usd: 123.45, eur: 113.01 },
    native: { usd: 12.34, eur: 11.31 },
    assets: { USDT: { usd: 111.11, eur: 101.7 } }
  })
  await upsertActivityHistoryRecord({
    id: '0xabc123',
    type: 'sent',
    asset: 'USDT',
    amount: '25',
    from: '0x1111111111111111111111111111111111111111',
    to: '0x2222222222222222222222222222222222222222',
    accountId: 'acc-1',
    status: 'pending',
    timestamp: Date.now(),
    networkId: 'eth'
  })

  const assetSnapshot = await readCachedAssetSnapshot({
    accountId: 'acc-1',
    networkId: 'eth',
    address: '0x1111111111111111111111111111111111111111'
  })
  const fiatSnapshot = await readCachedFiatSnapshot({
    accountId: 'acc-1',
    networkId: 'eth',
    address: '0x1111111111111111111111111111111111111111'
  })
  const activityRows = await readActivityHistoryRecords()

  assert(assetSnapshot?.assets?.USDT === 123450000, 'asset replay should restore the cached asset balance snapshot')
  assert(fiatSnapshot?.assets?.USDT?.usd === 111.11, 'fiat replay should restore the cached fiat snapshot')
  assert(activityRows.some((row) => row.id === '0xabc123' && row.networkId === 'eth'), 'activity replay should restore cached activity rows')

  await writeCachedAssetSnapshot({
    accountId: 'acc-expired',
    networkId: 'eth',
    address: '0x3333333333333333333333333333333333333333',
    fetchedAt: Date.now() - (31 * 60 * 1000),
    assets: { OLD: 1 },
    logos: {},
    labels: {},
    evmNfts: {}
  })
  await writeCachedFiatSnapshot({
    accountId: 'acc-expired',
    networkId: 'eth',
    address: '0x3333333333333333333333333333333333333333',
    fetchedAt: Date.now() - (16 * 60 * 1000),
    totals: { usd: 1, eur: 1 },
    native: { usd: 1, eur: 1 },
    assets: {}
  })
  await upsertActivityHistoryRecord({
    id: '0xold',
    type: 'received',
    asset: 'OLD',
    amount: '1',
    accountId: 'acc-expired',
    status: 'confirmed',
    timestamp: Date.now() - (181 * 24 * 60 * 60 * 1000),
    networkId: 'eth'
  })

  const expiredAsset = await readCachedAssetSnapshot({
    accountId: 'acc-expired',
    networkId: 'eth',
    address: '0x3333333333333333333333333333333333333333'
  })
  const expiredFiat = await readCachedFiatSnapshot({
    accountId: 'acc-expired',
    networkId: 'eth',
    address: '0x3333333333333333333333333333333333333333'
  })
  const prunedActivityRows = await readActivityHistoryRecords()

  assert(expiredAsset === null, 'expired asset snapshots should be pruned by TTL')
  assert(expiredFiat === null, 'expired fiat snapshots should be pruned by TTL')
  assert(!prunedActivityRows.some((row) => row.id === '0xold'), 'expired activity rows should be filtered by retention policy')
}

async function main(): Promise<void> {
  await runOfflinePopupOpenScenario()
  await runServerDownStartupScenario()
  await runRepositoryReplayScenario()
  await resetCatalogRepositoryForTesting()
  console.log('Catalog repository smoke checks passed.')
}

main().catch((error) => {
  console.error('Catalog repository smoke checks failed.')
  console.error(error)
  process.exitCode = 1
})
