import type {
  ServerCoinCapabilities,
  ServerCoinCatalogItem,
  ServerCoinCatalogProfile,
  ServerCoinCatalogWalletState,
  ServerCoinRow
} from './types'
import {
  EVM_MODEL_NETWORK_IDS,
  COSMOS_MODEL_NETWORK_IDS,
  inferRuntimeModelFromTokenLikeCoinId,
  isBlockedServerCoinId,
  isLikelyTokenServerCoinLike,
  mapServerCoinIdToNetworkId,
  normalizeServerCoinSymbol,
  resolveAppNetworkId
} from './mappings'
import { isServerCoinBridgeEnabled, resolveServerCoinChain, resolveServerCoinId } from './types'

function resolveActiveServerNetworkChain(coin: ServerCoinRow): 'main' | 'test' {
  const rows = Array.isArray(coin.networks) ? coin.networks.filter((n) => n && n.isActive !== false) : []
  if (rows.length === 0) return resolveServerCoinChain(coin, null)
  const main = rows.find((n) => String(n.chain || '').trim().toLowerCase() === 'main')
  const selected = main || rows[0]
  return resolveServerCoinChain(coin, selected)
}

export function isLikelyTokenServerCoin(coin: ServerCoinRow): boolean {
  return isLikelyTokenServerCoinLike(
    String(coin?.coinId || ''),
    String(coin?.name || ''),
    String(coin?.symbol || '')
  )
}

function normalizeCapabilities(capabilities: ServerCoinRow['capabilities']): Required<ServerCoinCapabilities> {
  return {
    rpcBridge: capabilities?.rpcBridge === true,
    sync: capabilities?.sync === true,
    balance: capabilities?.balance === true,
    assets: capabilities?.assets === true,
    history: capabilities?.history === true,
    send: capabilities?.send === true,
    broadcast: capabilities?.broadcast === true
  }
}

function summarizeCapabilities(capabilities: Required<ServerCoinCapabilities>): string {
  return [
    capabilities.rpcBridge,
    capabilities.sync,
    capabilities.balance,
    capabilities.assets,
    capabilities.history,
    capabilities.send,
    capabilities.broadcast
  ].map((value) => (value ? 'Y' : 'N')).join('/')
}

function resolveCatalogWalletState(input: {
  coinId: string
  bridgeEnabled: boolean
  capabilities: Required<ServerCoinCapabilities>
}): ServerCoinCatalogWalletState {
  if (isBlockedServerCoinId(input.coinId)) return 'blocked'
  if (!input.bridgeEnabled) return 'catalog-only'
  if (
    input.capabilities.sync
    || input.capabilities.balance
    || input.capabilities.assets
    || input.capabilities.history
    || input.capabilities.send
    || input.capabilities.broadcast
  ) {
    return 'active'
  }
  return 'catalog-only'
}

function resolveOperationalModel(runtimeModelId: string | null, coinId: string, capabilities: Required<ServerCoinCapabilities>): string {
  if (!capabilities.rpcBridge) return 'catalog-registry'
  if (runtimeModelId === 'ada' || coinId === 'cardano') return 'cardano-utxo-hybrid'
  if (runtimeModelId === 'sol' || coinId === 'solana') return 'solana-account-program'
  if (runtimeModelId === 'sui' || coinId === 'sui') return 'sui-account-object'
  if (runtimeModelId === 'xlm' || coinId === 'stellar' || coinId === 'xlm') return 'stellar-account'
  if (runtimeModelId === 'tron' || coinId === 'tron') return 'tron-account'
  if (runtimeModelId === 'rtm' || coinId === 'raptoreum') return 'utxo-asset-layer'
  if (runtimeModelId === 'srv--bitcoin' || runtimeModelId === 'doge' || runtimeModelId === 'dash' || runtimeModelId === 'firo' || runtimeModelId === 'btcz') {
    return 'utxo'
  }
  if (runtimeModelId && EVM_MODEL_NETWORK_IDS.has(runtimeModelId)) return 'evm-account'
  if (runtimeModelId && COSMOS_MODEL_NETWORK_IDS.has(runtimeModelId)) return 'cosmos-sdk'
  if (capabilities.rpcBridge && !capabilities.sync && !capabilities.balance && !capabilities.assets && !capabilities.history && !capabilities.send && !capabilities.broadcast) {
    return 'rpc-only'
  }
  return runtimeModelId || 'generic'
}

function resolveTransport(bridgeEnabled: boolean, capabilities: Required<ServerCoinCapabilities>): ServerCoinCatalogProfile['transport'] {
  if (!bridgeEnabled) return 'registry-only'
  if (
    capabilities.sync
    || capabilities.balance
    || capabilities.assets
    || capabilities.history
    || capabilities.send
    || capabilities.broadcast
  ) {
    return 'wallet-bridge'
  }
  return 'rpc-passthrough'
}

function dedupeStrings(values: Array<string | undefined | null>): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const value of values) {
    const normalized = String(value || '').trim()
    if (!normalized) continue
    if (seen.has(normalized)) continue
    seen.add(normalized)
    out.push(normalized)
  }
  return out
}

function resolveAssetStandards(runtimeModelId: string | null, coinId: string, capabilities: Required<ServerCoinCapabilities>): {
  tokenStandards: string[]
  nftStandards: string[]
  assetStandards: string[]
} {
  if (runtimeModelId && EVM_MODEL_NETWORK_IDS.has(runtimeModelId)) {
    return {
      tokenStandards: capabilities.assets ? ['erc20'] : [],
      nftStandards: capabilities.assets ? ['erc721', 'erc1155'] : [],
      assetStandards: capabilities.assets ? ['erc20', 'erc721', 'erc1155'] : []
    }
  }
  if (runtimeModelId === 'sol' || coinId === 'solana') {
    return {
      tokenStandards: capabilities.assets ? ['spl-token'] : [],
      nftStandards: capabilities.assets ? ['spl-nft'] : [],
      assetStandards: capabilities.assets ? ['spl-token', 'spl-nft'] : []
    }
  }
  if (runtimeModelId === 'sui' || coinId === 'sui') {
    return {
      tokenStandards: capabilities.assets ? ['sui-coin'] : [],
      nftStandards: capabilities.assets ? ['sui-object'] : [],
      assetStandards: capabilities.assets ? ['sui-coin', 'sui-object'] : []
    }
  }
  if (runtimeModelId === 'ada' || coinId === 'cardano') {
    return {
      tokenStandards: capabilities.assets ? ['cardano-native-asset'] : [],
      nftStandards: capabilities.assets ? ['cardano-native-asset'] : [],
      assetStandards: capabilities.assets ? ['cardano-native-asset'] : []
    }
  }
  if (runtimeModelId === 'xlm' || coinId === 'stellar' || coinId === 'xlm') {
    return {
      tokenStandards: capabilities.assets ? ['stellar-issued-asset'] : [],
      nftStandards: [],
      assetStandards: capabilities.assets ? ['stellar-issued-asset'] : []
    }
  }
  if (runtimeModelId === 'rtm' || coinId === 'raptoreum') {
    return {
      tokenStandards: capabilities.assets ? ['rtm-asset'] : [],
      nftStandards: capabilities.assets ? ['rtm-asset'] : [],
      assetStandards: capabilities.assets ? ['rtm-asset'] : []
    }
  }
  return { tokenStandards: [], nftStandards: [], assetStandards: [] }
}

function resolveApiRoutes(coinId: string, chain: 'main' | 'test', capabilities: Required<ServerCoinCapabilities>): ServerCoinCatalogProfile['apiRoutes'] {
  const walletScoped = coinId === 'raptoreum' || coinId === 'xrp'
  const walletSuffix = walletScoped ? '/wallet/{wallet}' : ''
  return {
    bridge: capabilities.rpcBridge ? `/v1/bridge/${coinId}/${chain}${walletSuffix}` : undefined,
    sendCoin: capabilities.send ? `/v1/bridge/send/coin/${coinId}/${chain}${walletScoped ? '/{wallet}' : ''}` : undefined,
    sendAsset: capabilities.assets && capabilities.send
      ? `/v1/bridge/send/asset/${coinId}/${chain}${walletScoped ? '/{wallet}' : ''}`
      : undefined
  }
}

function buildCatalogProfile(input: {
  coin: ServerCoinRow
  coinId: string
  chain: 'main' | 'test'
  runtimeModelId: string | null
  bridgeEnabled: boolean
  capabilities: Required<ServerCoinCapabilities>
}): ServerCoinCatalogProfile {
  const networks = Array.isArray(input.coin.networks) ? input.coin.networks : []
  const connectionProviders = dedupeStrings(
    networks.map((row) => String(row?.metadata?.provider || '').trim().toLowerCase())
  )
  const rpcUrls = dedupeStrings(networks.map((row) => row?.rpcUrl))
  const rpcWallets = dedupeStrings(networks.map((row) => row?.rpcWallet))
  const transport = resolveTransport(input.bridgeEnabled, input.capabilities)
  const operationalModel = resolveOperationalModel(input.runtimeModelId, input.coinId, input.capabilities)
  const standards = resolveAssetStandards(input.runtimeModelId, input.coinId, input.capabilities)

  return {
    policy: String(input.coin.policy || (input.coin.enabled === false ? 'disabled' : 'enabled')).trim() || 'enabled',
    transport,
    capabilitySummary: summarizeCapabilities(input.capabilities),
    description: String(input.coin.description || '').trim() || `${input.coinId} ${transport.replace(/-/g, ' ')}`.trim(),
    operationalModel: String(input.coin.algorithmModel || '').trim() || operationalModel,
    connectionProviders,
    rpcUrls,
    rpcWallets,
    apiRoutes: resolveApiRoutes(input.coinId, input.chain, input.capabilities),
    tokenStandards: standards.tokenStandards,
    nftStandards: standards.nftStandards,
    assetStandards: standards.assetStandards
  }
}

export function buildServerCoinCatalog(coins: ServerCoinRow[]): ServerCoinCatalogItem[] {
  const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]+$/
  const findHexAddressInValue = (value: unknown): string => {
    const text = String(value ?? '').trim()
    const m = text.match(/0x[a-fA-F0-9]{40}/)
    return m ? m[0] : ''
  }
  const findTronAddressInValue = (value: unknown): string => {
    const text = String(value ?? '').trim()
    const m = text.match(/\bT[1-9A-HJ-NP-Za-km-z]{33}\b/)
    return m ? m[0] : ''
  }
  const findSolanaMintInValue = (value: unknown): string => {
    const text = String(value ?? '').trim()
    if (text.length < 32 || text.length > 44) return ''
    if (!BASE58_RE.test(text)) return ''
    return text
  }
  const findTokenAddressInValue = (value: unknown): string => {
    return (
      findHexAddressInValue(value)
      || findTronAddressInValue(value)
      || findSolanaMintInValue(value)
    )
  }
  const findContractAddress = (coin: ServerCoinRow): string => {
    const direct = findTokenAddressInValue(coin.coinId) || findTokenAddressInValue(coin.name)
    if (direct) return direct

    const directFieldCandidates = [
      (coin as any)?.contractAddress,
      (coin as any)?.tokenAddress,
      (coin as any)?.mintAddress,
      (coin as any)?.address,
      (coin as any)?.mint
    ]
    for (const value of directFieldCandidates) {
      const fromField = findTokenAddressInValue(value)
      if (fromField) return fromField
    }

    const networks = Array.isArray(coin.networks) ? coin.networks : []
    for (const row of networks) {
      const metadata = row?.metadata && typeof row.metadata === 'object' ? row.metadata : null
      if (!metadata) continue
      const preferredMetaKeys = ['contractAddress', 'tokenAddress', 'mintAddress', 'address', 'mint', 'ca', 'contract']
      for (const key of preferredMetaKeys) {
        if (!(key in metadata)) continue
        const fromPreferred = findTokenAddressInValue((metadata as Record<string, unknown>)[key])
        if (fromPreferred) return fromPreferred
      }
      for (const value of Object.values(metadata)) {
        const fromMeta = findTokenAddressInValue(value)
        if (fromMeta) return fromMeta
      }
    }
    return ''
  }

  const out: ServerCoinCatalogItem[] = []
  for (const coin of coins) {
    if (!coin?.enabled) continue
    const coinId = resolveServerCoinId(coin)
    if (!coinId) continue

    const chain = resolveActiveServerNetworkChain(coin)
    const tokenLike = isLikelyTokenServerCoin(coin)
    const mappedModel = mapServerCoinIdToNetworkId(coinId)
    const runtimeModelId = tokenLike ? (inferRuntimeModelFromTokenLikeCoinId(coinId) || mappedModel) : mappedModel
    const bridgeEnabled = isServerCoinBridgeEnabled(coin)
    const capabilities = normalizeCapabilities(coin.capabilities)
    const walletCatalogState = resolveCatalogWalletState({
      coinId,
      bridgeEnabled,
      capabilities
    })
    const appNetworkId = walletCatalogState === 'active' && runtimeModelId
      ? (tokenLike ? runtimeModelId : resolveAppNetworkId(runtimeModelId, coinId))
      : null

    out.push({
      coinId,
      name: String(coin.name || coinId).trim() || coinId,
      symbol: normalizeServerCoinSymbol(coinId, String(coin.symbol || '').trim()),
      kind: tokenLike ? 'asset' : 'main',
      contractAddress: tokenLike ? (findContractAddress(coin) || undefined) : undefined,
      runtimeModelId: runtimeModelId || null,
      appNetworkId,
      chain,
      enabled: true,
      bridgeImplemented: bridgeEnabled,
      capabilities,
      walletCatalogState,
      catalogProfile: buildCatalogProfile({
        coin,
        coinId,
        chain,
        runtimeModelId: runtimeModelId || null,
        bridgeEnabled,
        capabilities
      })
    })
  }

  return out.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'main' ? -1 : 1
    const left = `${a.name}|${a.coinId}`.toLowerCase()
    const right = `${b.name}|${b.coinId}`.toLowerCase()
    return left.localeCompare(right)
  })
}
