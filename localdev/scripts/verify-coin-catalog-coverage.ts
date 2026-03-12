import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  isBlockedServerCoinId,
  mapServerCoinIdToNetworkId,
  resolveAppNetworkId
} from '../src/coins/serverRegistry/mappings'

type CatalogRow = {
  coinId: string
  chain: string
  type: string
  api: string
  caps: string
}

type CoverageKind =
  | 'wallet-runtime'
  | 'catalog-only'
  | 'blocked'
  | 'missing-runtime'

type CoverageResult = {
  coinId: string
  chain: string
  coverage: CoverageKind
  mappedNetworkId: string | null
  appNetworkId: string | null
  details?: string
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const CATALOG_PATH = path.resolve(__dirname, '../../..', 'metayoshi_SERVER', 'NewServer', 'docs', 'COIN_CATALOG.md')
const BUNDLED_CATALOG_PATH = path.resolve(__dirname, '../src/coins/catalog.ts')

async function loadBundledManifestIds(): Promise<Set<string>> {
  const source = await readFile(BUNDLED_CATALOG_PATH, 'utf8')
  const out = new Set<string>()
  for (const match of source.matchAll(/\bid:\s*'([^']+)'/g)) {
    const value = String(match[1] || '').trim()
    if (value) out.add(value)
  }
  return out
}

function parseCatalogRows(markdown: string): CatalogRow[] {
  const rows: CatalogRow[] = []
  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line.startsWith('|')) continue
    if (line.includes('| --- ')) continue
    const columns = line.split('|').slice(1, -1).map((part) => part.trim())
    if (columns.length < 13) continue
    if (columns[0] === '#' || !/^\d+$/.test(columns[0])) continue
    rows.push({
      coinId: String(columns[1] || '').trim().toLowerCase(),
      chain: String(columns[2] || '').trim().toLowerCase(),
      type: String(columns[5] || '').trim(),
      api: String(columns[7] || '').trim(),
      caps: String(columns[8] || '').trim()
    })
  }
  return rows
}

function isCatalogOnlyRow(row: CatalogRow): boolean {
  if (row.api.toUpperCase() === 'N/A') return true
  const type = row.type.toLowerCase()
  if (type.includes('registry-only')) return true
  if (type.includes('rpc passthrough-only')) return true
  return row.caps.toUpperCase() === 'N/N/N/N/N/N/N'
}

function verifyRow(row: CatalogRow, bundledManifestIds: Set<string>): CoverageResult {
  if (isBlockedServerCoinId(row.coinId)) {
    return {
      coinId: row.coinId,
      chain: row.chain,
      coverage: 'blocked',
      mappedNetworkId: null,
      appNetworkId: null
    }
  }

  if (isCatalogOnlyRow(row)) {
    return {
      coinId: row.coinId,
      chain: row.chain,
      coverage: 'catalog-only',
      mappedNetworkId: null,
      appNetworkId: null
    }
  }

  const mappedNetworkId = mapServerCoinIdToNetworkId(row.coinId)
  if (!mappedNetworkId) {
    return {
      coinId: row.coinId,
      chain: row.chain,
      coverage: 'missing-runtime',
      mappedNetworkId: null,
      appNetworkId: null,
      details: 'No runtime model mapping'
    }
  }

  const appNetworkId = resolveAppNetworkId(mappedNetworkId, row.coinId)

  if (!bundledManifestIds.has(mappedNetworkId)) {
    return {
      coinId: row.coinId,
      chain: row.chain,
      coverage: 'missing-runtime',
      mappedNetworkId,
      appNetworkId,
      details: 'Mapped runtime id is not bundled'
    }
  }

  return {
    coinId: row.coinId,
    chain: row.chain,
    coverage: 'wallet-runtime',
    mappedNetworkId,
    appNetworkId
  }
}

async function main(): Promise<void> {
  const [markdown, bundledManifestIds] = await Promise.all([
    readFile(CATALOG_PATH, 'utf8'),
    loadBundledManifestIds()
  ])
  const rows = parseCatalogRows(markdown)
  if (rows.length === 0) {
    throw new Error(`No catalog rows parsed from ${CATALOG_PATH}`)
  }

  const results = rows.map((row) => verifyRow(row, bundledManifestIds))
  const failures = results.filter((result) => result.coverage.startsWith('missing'))
  const counts = new Map<CoverageKind, number>()
  for (const result of results) {
    counts.set(result.coverage, (counts.get(result.coverage) || 0) + 1)
  }

  console.log(`Coin catalog rows checked: ${results.length}`)
  for (const key of ['wallet-runtime', 'catalog-only', 'blocked', 'missing-runtime'] as CoverageKind[]) {
    console.log(`${key}: ${counts.get(key) || 0}`)
  }

  if (failures.length > 0) {
    console.error('')
    console.error('Coverage failures:')
    for (const failure of failures) {
      console.error(`- ${failure.coinId} (${failure.chain}): ${failure.coverage}${failure.details ? ` - ${failure.details}` : ''}`)
    }
    process.exitCode = 1
    return
  }

  console.log('')
  console.log('All wallet-eligible catalog rows resolve to bundled runtime support.')
}

void main().catch((error) => {
  console.error('Coin catalog coverage verification failed.')
  console.error(error)
  process.exitCode = 1
})
