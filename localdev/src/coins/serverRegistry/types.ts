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

export type ServerCoinCapabilities = {
  rpcBridge?: boolean
  sync?: boolean
  balance?: boolean
  assets?: boolean
  history?: boolean
  send?: boolean
  broadcast?: boolean
}

export type ServerCoinRow = {
  coinId?: string
  id?: string
  name?: string
  symbol?: string
  chain?: string
  enabled?: boolean
  bridgeImplemented?: boolean
  capabilities?: ServerCoinCapabilities
  features?: { bridge?: boolean }
  methodGroups?: Record<string, string[]>
  networks?: ServerCoinNetworkRow[]
  policy?: string
  description?: string
  type?: string
  connection?: string
  api?: string
  tokens?: string
  nfts?: string
  erc?: string
  algorithmModel?: string
}

export type ServerCoinCatalogKind = 'main' | 'asset'
export type ServerCoinCatalogWalletState = 'active' | 'blocked' | 'catalog-only'

export type ServerCoinCatalogProfile = {
  policy: string
  transport: 'wallet-bridge' | 'rpc-passthrough' | 'registry-only'
  capabilitySummary: string
  description: string
  operationalModel: string
  connectionProviders: string[]
  rpcUrls: string[]
  rpcWallets: string[]
  apiRoutes: {
    bridge?: string
    sendCoin?: string
    sendAsset?: string
  }
  tokenStandards: string[]
  nftStandards: string[]
  assetStandards: string[]
}

export type ServerCoinCatalogItem = {
  coinId: string
  name: string
  symbol: string
  kind: ServerCoinCatalogKind
  contractAddress?: string
  runtimeModelId: string | null
  appNetworkId: string | null
  chain: 'main' | 'test'
  enabled: boolean
  bridgeImplemented: boolean
  capabilities: Required<ServerCoinCapabilities>
  walletCatalogState: ServerCoinCatalogWalletState
  catalogProfile: ServerCoinCatalogProfile
  source?: 'metayoshi-server' | 'bundled-registry' | 'research-top100'
  logoUrl?: string
  hostRuntime?: string | null
  walletRuntimeHint?: string | null
  algorithm?: string | null
  proofType?: string | null
  metadata?: Record<string, unknown>
}

export type NetworkCandidate = {
  appNetworkId: string
  network: Network
  chain: 'main' | 'test'
  isPublicnode: boolean
}

export function resolveServerCoinId(coin: ServerCoinRow): string {
  return String(coin.coinId || coin.id || '').trim().toLowerCase()
}

export function isServerCoinBridgeEnabled(coin: ServerCoinRow): boolean {
  if (coin?.features?.bridge === false) return false
  if (coin?.bridgeImplemented === false) return false
  if (coin?.capabilities?.rpcBridge === false) return false
  return true
}

export function resolveServerCoinChain(
  coin: ServerCoinRow,
  selectedNetwork?: ServerCoinNetworkRow | null
): 'main' | 'test' {
  const selectedChain = String(selectedNetwork?.chain || '').trim().toLowerCase()
  if (selectedChain === 'main' || selectedChain === 'test') return selectedChain
  return String(coin.chain || '').trim().toLowerCase() === 'test' ? 'test' : 'main'
}
