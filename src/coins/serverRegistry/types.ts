import type { Network } from '../types'

export type ServerCoinNetworkRow = {
  chain?: string
  rpcUrl?: string
  rpcWallet?: string
  rpcUser?: string
  isActive?: boolean
  metadata?: {
    provider?: string
    [key: string]: unknown
  }
}

export type ServerCoinRow = {
  coinId?: string
  name?: string
  symbol?: string
  enabled?: boolean
  features?: { bridge?: boolean }
  methodGroups?: Record<string, string[]>
  networks?: ServerCoinNetworkRow[]
}

export type ServerCoinCatalogKind = 'main' | 'asset'

export type ServerCoinCatalogItem = {
  coinId: string
  name: string
  symbol: string
  kind: ServerCoinCatalogKind
  contractAddress?: string
  runtimeModelId: string | null
  appNetworkId: string | null
  chain: 'main' | 'test'
}

export type NetworkCandidate = {
  appNetworkId: string
  network: Network
  chain: 'main' | 'test'
  isPublicnode: boolean
}
