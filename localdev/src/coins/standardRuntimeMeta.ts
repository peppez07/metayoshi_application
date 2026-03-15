import type { CoinProtocolFamily } from './registryTypes'
import { getStandardRuntimeMetaMap } from './coinRegistry'

export type StandardRuntimeMeta = {
  symbol: string
  coinId: string
  chain?: 'main' | 'test'
  protocolFamily: CoinProtocolFamily
  chainId?: number
}

let standardRuntimeMetaCache: Record<string, StandardRuntimeMeta> | null = null

function getStandardRuntimeMetaCache(): Record<string, StandardRuntimeMeta> {
  if (!standardRuntimeMetaCache) {
    standardRuntimeMetaCache = getStandardRuntimeMetaMap()
  }
  return standardRuntimeMetaCache
}

export const STANDARD_RUNTIME_META: Record<string, StandardRuntimeMeta> = new Proxy({}, {
  get(_target, prop) {
    return getStandardRuntimeMetaCache()[String(prop)]
  },
  has(_target, prop) {
    return String(prop) in getStandardRuntimeMetaCache()
  },
  ownKeys() {
    return Reflect.ownKeys(getStandardRuntimeMetaCache())
  },
  getOwnPropertyDescriptor(_target, prop) {
    const value = getStandardRuntimeMetaCache()[String(prop)]
    if (value === undefined) return undefined
    return {
      configurable: true,
      enumerable: true,
      writable: false,
      value
    }
  }
})
