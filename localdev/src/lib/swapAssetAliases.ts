import type { Network } from '../coins'
import { resolveRuntimeModelId } from './runtimeModel'

export type SwapAliasOption = {
  id: string
  kind: 'native' | 'fungible' | 'nft'
  symbol: string
}

const ETH_LIKE_MODEL_IDS = new Set([
  'eth',
  'arb',
  'op',
  'base',
  'aurora',
  'zksync'
])

function normalizeSymbol(value: string): string {
  return String(value || '').trim().toUpperCase()
}

function findAliasGroup(groups: string[][], symbol: string): string[] | null {
  const normalizedSymbol = normalizeSymbol(symbol)
  for (const group of groups) {
    if (group.includes(normalizedSymbol)) return group
  }
  return null
}

export function resolveWrappedEquivalentSymbols(
  network: Pick<Network, 'id' | 'runtimeModelId' | 'symbol'>,
  symbol: string
): string[] {
  const normalizedSymbol = normalizeSymbol(symbol)
  if (!normalizedSymbol) return []

  const modelId = resolveRuntimeModelId(network)
  const groups: string[][] = []

  if (ETH_LIKE_MODEL_IDS.has(modelId)) groups.push(['ETH', 'WETH'])
  if (modelId === 'polygon') groups.push(['POL', 'MATIC', 'WPOL', 'WMATIC'])
  if (modelId === 'bnb') groups.push(['BNB', 'WBNB'])
  if (modelId === 'avaxc') groups.push(['AVAX', 'WAVAX'])
  if (modelId === 'cronos' || modelId === 'cro') groups.push(['CRO', 'WCRO'])
  if (modelId === 'gnosis') groups.push(['XDAI', 'WXDAI'])
  if (modelId === 'bahamut') groups.push(['FTN', 'WFTN'])

  const matched = findAliasGroup(groups, normalizedSymbol)
  if (matched) return matched

  const nativeSymbol = normalizeSymbol(network.symbol)
  if (!nativeSymbol) return [normalizedSymbol]
  if (normalizedSymbol === nativeSymbol) return [nativeSymbol, `W${nativeSymbol}`]
  if (normalizedSymbol === `W${nativeSymbol}`) return [nativeSymbol, `W${nativeSymbol}`]
  return [normalizedSymbol]
}

export function findSwapAssetAliasOptions<T extends SwapAliasOption>(
  selected: T | null,
  allOptions: T[],
  network: Pick<Network, 'id' | 'runtimeModelId' | 'symbol'>
): T[] {
  if (!selected) return []
  const aliasSymbols = resolveWrappedEquivalentSymbols(network, selected.symbol)
  if (aliasSymbols.length <= 1) return [selected]

  const selectedSymbol = normalizeSymbol(selected.symbol)
  const byId = new Map<string, T>()
  byId.set(selected.id, selected)

  for (const option of allOptions) {
    if (!option) continue
    const optionSymbol = normalizeSymbol(option.symbol)
    if (!aliasSymbols.includes(optionSymbol)) continue
    if (option.kind === 'nft') continue
    byId.set(option.id, option)
  }

  const ordered = [...byId.values()].sort((left, right) => {
    const leftScore = normalizeSymbol(left.symbol) === selectedSymbol ? 0 : 1
    const rightScore = normalizeSymbol(right.symbol) === selectedSymbol ? 0 : 1
    if (leftScore !== rightScore) return leftScore - rightScore
    return normalizeSymbol(left.symbol).localeCompare(normalizeSymbol(right.symbol))
  })

  return ordered
}
