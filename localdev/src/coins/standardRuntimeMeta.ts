import { getStandardRuntimeMetaMap } from './coinRegistry'

export type StandardRuntimeMeta = {
  symbol: string
  coinId: string
  chain?: 'main' | 'test'
}

export const STANDARD_RUNTIME_META: Record<string, StandardRuntimeMeta> = getStandardRuntimeMetaMap()
