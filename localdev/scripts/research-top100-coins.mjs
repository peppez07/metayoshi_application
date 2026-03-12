import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = path.resolve(__dirname, '../docs/research/top100-coin-catalog-snapshot.json')
const VS_CURRENCY = 'usd'
const COINGECKO_MARKETS_URL =
  `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${VS_CURRENCY}` +
  '&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h'
const COINGECKO_PLATFORMS_URL = 'https://api.coingecko.com/api/v3/coins/list?include_platform=true'
const CRYPTOCOMPARE_TOP_URL = 'https://min-api.cryptocompare.com/data/top/mktcapfull?limit=100&tsym=USD'
const CRYPTOCOMPARE_ALL_URL = 'https://min-api.cryptocompare.com/data/all/coinlist'

const HOST_RUNTIME_HINTS = [
  { match: ['ethereum', 'arbitrum-one', 'base', 'optimistic-ethereum', 'polygon-pos', 'binance-smart-chain', 'avalanche', 'zksync', 'scroll', 'linea', 'mantle', 'blast'], runtime: 'evm' },
  { match: ['solana'], runtime: 'solana' },
  { match: ['tron'], runtime: 'tron' },
  { match: ['the-open-network'], runtime: 'ton' },
  { match: ['stellar'], runtime: 'stellar' },
  { match: ['hedera-hashgraph'], runtime: 'hedera' },
  { match: ['aptos'], runtime: 'aptos' },
  { match: ['sui'], runtime: 'sui' },
  { match: ['cardano'], runtime: 'cardano' },
  { match: ['algorand'], runtime: 'algorand' },
  { match: ['near-protocol'], runtime: 'near' },
  { match: ['cosmos', 'osmosis', 'injective', 'noble'], runtime: 'cosmos' },
  { match: ['xrp-ledger'], runtime: 'xrp' }
]

const NATIVE_RUNTIME_HINTS = new Map([
  ['bitcoin', 'utxo'],
  ['dogecoin', 'utxo'],
  ['litecoin', 'utxo'],
  ['bitcoin-cash', 'utxo'],
  ['dash', 'utxo'],
  ['zcash', 'utxo'],
  ['decred', 'utxo'],
  ['monero', 'privacy'],
  ['ethereum', 'evm'],
  ['ethereum-classic', 'evm'],
  ['binancecoin', 'evm'],
  ['solana', 'solana'],
  ['tron', 'tron'],
  ['ripple', 'xrp'],
  ['cardano', 'cardano'],
  ['stellar', 'stellar'],
  ['sui', 'sui'],
  ['aptos', 'aptos'],
  ['hedera-hashgraph', 'hedera'],
  ['polkadot', 'substrate'],
  ['kusama', 'substrate'],
  ['cosmos', 'cosmos'],
  ['osmosis', 'cosmos'],
  ['injective-protocol', 'cosmos'],
  ['crypto-com-chain', 'cosmos'],
  ['toncoin', 'ton'],
  ['near', 'near'],
  ['algorand', 'algorand'],
  ['avalanche-2', 'evm'],
  ['internet-computer', 'icp'],
  ['vechain', 'vechain'],
  ['filecoin', 'filecoin'],
  ['kaspa', 'pow-dag'],
  ['bittensor', 'substrate'],
  ['canton', 'daml'],
  ['pi-network', 'native'],
  ['flare-networks', 'evm'],
  ['xdc-network', 'evm'],
  ['provenance-blockchain', 'provenance']
])

const STABLECOIN_SYMBOLS = new Set(['USDT', 'USDC', 'USDS', 'USDE', 'DAI', 'FDUSD', 'USDD', 'PYUSD', 'TUSD', 'EURC', 'GHO', 'BFUSD', 'USDB'])
const MEME_SYMBOLS = new Set(['DOGE', 'SHIB', 'PEPE', 'BONK', 'FLOKI', 'WIF', 'BRETT'])
const EXCHANGE_SYMBOLS = new Set(['BNB', 'LEO', 'WBT', 'KCS', 'BGB', 'GT', 'CRO'])
const PRIVACY_IDS = new Set(['monero', 'zcash', 'zencash', 'dash'])
const LAYER1_IDS = new Set([
  'bitcoin', 'ethereum', 'solana', 'tron', 'cardano', 'ripple', 'avalanche-2', 'sui', 'aptos', 'polkadot',
  'near', 'toncoin', 'algorand', 'hedera-hashgraph', 'internet-computer', 'vechain', 'stellar', 'cosmos',
  'osmosis', 'injective-protocol', 'filecoin', 'flare-networks', 'xdc-network', 'kaspa', 'bittensor',
  'provenance-blockchain', 'canton'
])
const LAYER2_IDS = new Set(['arbitrum', 'optimism', 'immutable-x', 'starknet'])
const ORACLE_SYMBOLS = new Set(['LINK', 'PYTH'])
const STORAGE_IDS = new Set(['filecoin', 'bittorrent'])

function uniq(values) {
  return [...new Set((values || []).map((value) => String(value || '').trim()).filter(Boolean))]
}

function compactObject(value) {
  if (Array.isArray(value)) return value.map(compactObject).filter((item) => item !== undefined)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, inner]) => [key, compactObject(inner)])
        .filter(([, inner]) => {
          if (inner === undefined || inner === null) return false
          if (Array.isArray(inner)) return inner.length > 0
          if (typeof inner === 'object') return Object.keys(inner).length > 0
          return true
        })
    )
  }
  if (value === undefined) return undefined
  return value
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'metayoshi-wallet-research/1.0'
    }
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`HTTP ${response.status} for ${url}: ${body.slice(0, 240)}`)
  }

  return response.json()
}

function normalizePlatformContracts(platforms) {
  return uniq(
    Object.entries(platforms || {})
      .map(([platformId, contractAddress]) => {
        const cleanAddress = String(contractAddress || '').trim()
        return cleanAddress ? `${platformId}:${cleanAddress}` : ''
      })
  ).map((entry) => {
    const splitIndex = entry.indexOf(':')
    return {
      platformId: entry.slice(0, splitIndex),
      contractAddress: entry.slice(splitIndex + 1)
    }
  })
}

function resolveHostRuntime(platformContracts) {
  const platformKeys = platformContracts.map((row) => row.platformId.toLowerCase())
  for (const hint of HOST_RUNTIME_HINTS) {
    if (platformKeys.some((platformId) => hint.match.includes(platformId))) return hint.runtime
  }
  return platformKeys[0] || null
}

function summarizeTaxonomy(taxonomy) {
  const normalized = compactObject({
    access: taxonomy?.Access,
    industry: taxonomy?.Industry,
    fca: taxonomy?.FCA,
    finma: taxonomy?.FINMA,
    collateralizedAsset: taxonomy?.CollateralizedAsset,
    collateralizedAssetType: taxonomy?.CollateralizedAssetType,
    collateralType: taxonomy?.CollateralType
  })
  return Object.keys(normalized).length > 0 ? normalized : undefined
}

function detectSegments({ geckoId, symbol }) {
  const segments = []

  if (STABLECOIN_SYMBOLS.has(symbol)) segments.push('stablecoin')
  if (MEME_SYMBOLS.has(symbol)) segments.push('meme')
  if (EXCHANGE_SYMBOLS.has(symbol)) segments.push('exchange')
  if (PRIVACY_IDS.has(geckoId)) segments.push('privacy')
  if (LAYER1_IDS.has(geckoId)) segments.push('layer1')
  if (LAYER2_IDS.has(geckoId)) segments.push('layer2')
  if (ORACLE_SYMBOLS.has(symbol)) segments.push('oracle')
  if (STORAGE_IDS.has(geckoId)) segments.push('storage')
  return uniq(segments)
}

function buildLookups(platformRows, cryptoCompareTopRows, cryptoCompareAllRows) {
  const geckoById = new Map(platformRows.map((row) => [String(row.id || '').trim().toLowerCase(), row]))
  const ccTopBySymbol = new Map(
    (cryptoCompareTopRows || [])
      .map((row) => row?.CoinInfo)
      .filter(Boolean)
      .map((info) => [String(info.Name || '').trim().toUpperCase(), info])
  )

  const ccAllBySymbol = new Map()
  for (const row of Object.values(cryptoCompareAllRows || {})) {
    const symbol = String(row?.Symbol || '').trim().toUpperCase()
    if (!symbol || ccAllBySymbol.has(symbol)) continue
    ccAllBySymbol.set(symbol, row)
  }

  return { geckoById, ccTopBySymbol, ccAllBySymbol }
}

function buildCoinRecord(market, lookups) {
  const geckoInfo = lookups.geckoById.get(String(market.id || '').trim().toLowerCase()) || {}
  const ccTop = lookups.ccTopBySymbol.get(String(market.symbol || '').trim().toUpperCase()) || {}
  const ccAll = lookups.ccAllBySymbol.get(String(market.symbol || '').trim().toUpperCase()) || {}
  const platformContracts = normalizePlatformContracts(geckoInfo.platforms)
  const hostRuntime = resolveHostRuntime(platformContracts)
  const forceNative = NATIVE_RUNTIME_HINTS.has(market.id)
  const isToken = !forceNative && platformContracts.length > 0
  const taxonomy = summarizeTaxonomy(ccAll.Taxonomy)
  const runtimeHint = forceNative
    ? NATIVE_RUNTIME_HINTS.get(market.id)
    : isToken
    ? hostRuntime
      ? `${hostRuntime}-token`
      : 'token'
    : (NATIVE_RUNTIME_HINTS.get(market.id) || hostRuntime || 'native')
  const description = String(ccAll.Description || '').replace(/\s+/g, ' ').trim()

  return compactObject({
    rank: market.market_cap_rank,
    geckoId: market.id,
    symbol: String(market.symbol || '').toUpperCase(),
    name: market.name,
    market: {
      priceUsd: market.current_price,
      marketCapUsd: market.market_cap,
      totalVolumeUsd: market.total_volume,
      marketCapChange24h: market.market_cap_change_percentage_24h
    },
    catalogType: isToken ? 'token' : 'native',
    hostRuntime,
    walletRuntimeHint: runtimeHint,
    algorithm: ccTop.Algorithm || ccAll.Algorithm || null,
    proofType: ccTop.ProofType || ccAll.ProofType || null,
    assetLaunchDate: ccTop.AssetLaunchDate || null,
    blockTimeSeconds: Number(ccTop.BlockTime) > 0 ? Number(ccTop.BlockTime) : null,
    assetTokenStatus: ccAll.AssetTokenStatus || null,
    taxonomy,
    imageUrl: ccAll.ImageUrl ? `https://www.cryptocompare.com${ccAll.ImageUrl}` : null,
    assetPlatforms: platformContracts,
    descriptionPreview: description ? description.slice(0, 320) : null,
    segments: detectSegments({
      geckoId: market.id,
      symbol: String(market.symbol || '').trim().toUpperCase()
    }),
    source: {
      marketUrl: COINGECKO_MARKETS_URL,
      platformListUrl: COINGECKO_PLATFORMS_URL,
      cryptoCompareTopUrl: CRYPTOCOMPARE_TOP_URL,
      cryptoCompareAllUrl: CRYPTOCOMPARE_ALL_URL,
      cryptoCompareOverviewUrl: ccAll.Url ? `https://www.cryptocompare.com${ccAll.Url}` : undefined
    }
  })
}

async function main() {
  const [markets, platformRows, cryptoCompareTop, cryptoCompareAll] = await Promise.all([
    fetchJson(COINGECKO_MARKETS_URL),
    fetchJson(COINGECKO_PLATFORMS_URL),
    fetchJson(CRYPTOCOMPARE_TOP_URL),
    fetchJson(CRYPTOCOMPARE_ALL_URL)
  ])

  if (!Array.isArray(markets) || markets.length !== 100) {
    throw new Error(`Expected 100 market rows, received ${Array.isArray(markets) ? markets.length : 'invalid payload'}`)
  }

  const lookups = buildLookups(platformRows, cryptoCompareTop?.Data, cryptoCompareAll?.Data)
  const assets = markets.map((market) => buildCoinRecord(market, lookups))

  const runtimeCounts = {}
  const segmentCounts = {}
  for (const asset of assets) {
    runtimeCounts[asset.walletRuntimeHint] = (runtimeCounts[asset.walletRuntimeHint] || 0) + 1
    for (const segment of asset.segments || []) {
      segmentCounts[segment] = (segmentCounts[segment] || 0) + 1
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: 'CoinGecko public API + CryptoCompare public API',
    selectionRule: 'Top 100 assets by market cap at generation time',
    notes: [
      'This file is research input for wallet catalog planning, not an authoritative support matrix.',
      'Use runtimeModelId, explicit network modules, and chain capability helpers for wallet behavior.',
      'Computed hostRuntime and walletRuntimeHint are heuristics derived from public metadata.'
    ],
    summary: {
      assetCount: assets.length,
      nativeAssets: assets.filter((asset) => asset.catalogType === 'native').length,
      tokenAssets: assets.filter((asset) => asset.catalogType === 'token').length,
      runtimeHintCounts: Object.fromEntries(Object.entries(runtimeCounts).sort(([left], [right]) => left.localeCompare(right))),
      segmentCounts: Object.fromEntries(Object.entries(segmentCounts).sort(([left], [right]) => left.localeCompare(right)))
    },
    assets
  }

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true })
  await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

  console.log(`Wrote ${assets.length} assets to ${OUTPUT_PATH}`)
  console.log(JSON.stringify(payload.summary, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
