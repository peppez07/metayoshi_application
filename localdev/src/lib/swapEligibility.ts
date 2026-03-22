import type { Network } from '../coins'
import type { ServerCoinCatalogItem } from '../coins/serverRegistry/types'
import type { SendableItem } from '../store/walletStore'
import { resolveNetworkCapabilities } from './networkCapabilities'

const EVM_CONTRACT_RE = /^0x[a-f0-9]{40}$/i
const SWAP_TESTNET_ID_MARKERS = /(testnet|sepolia|hoodi|fuji|amoy|minato|blaze|chiado|agung|preview|preprod)/i
const SWAP_TESTNET_EVM_CHAIN_IDS = new Set<number>([
  97,
  43113,
  80002,
  84532,
  11155420,
  11155111,
  421614
])

function normalizeText(value: unknown): string {
  return String(value || '').trim().toLowerCase()
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function normalizeSwapCapabilityNetworkId(value: unknown): string {
  const raw = normalizeText(value).replace(/[_\s]+/g, '-')
  if (!raw) return ''
  switch (raw) {
    case 'sol':
    case 'solana-mainnet':
    case 'solana-mainnet-beta':
    case 'mainnet-beta':
      return 'solana'
    case 'ethereum':
    case '1':
      return 'eth'
    case 'arbitrum':
    case 'arbitrum-one':
    case '42161':
      return 'arb'
    case 'optimism':
    case '10':
      return 'op'
    case '8453':
      return 'base'
    case 'tron-mainnet':
      return 'tron'
    case 'bnb':
    case 'binance-smart-chain':
      return 'bsc'
    case 'cosmos':
    case 'cosmoshub-4':
      return 'cosmoshub'
    case 'osmosis-1':
      return 'osmosis'
    default:
      return raw
  }
}

export function extractSwapContractAddress(assetId?: string): string | undefined {
  const raw = String(assetId || '').trim()
  const match = raw.match(/0x[a-fA-F0-9]{40}/)
  return match ? match[0].toLowerCase() : undefined
}

export function isSwapActionEnabledNetwork(
  network?: Pick<Network, 'coinType' | 'capabilities' | 'supportsAssets'> | null
): boolean {
  if (!network) return false
  const capabilities = resolveNetworkCapabilities(network)
  return capabilities.features.swap || capabilities.ui.showSwapAction
}

export function isSwapTestnetNetwork(
  network?: Pick<Network, 'id' | 'runtimeModelId' | 'chainId'> | null
): boolean {
  if (!network) return false
  const id = normalizeText(network.id)
  const runtimeModelId = normalizeText(network.runtimeModelId)
  if (SWAP_TESTNET_ID_MARKERS.test(id) || SWAP_TESTNET_ID_MARKERS.test(runtimeModelId)) {
    return true
  }
  const chainId = typeof network.chainId === 'number' ? network.chainId : Number(network.chainId)
  return Number.isFinite(chainId) && SWAP_TESTNET_EVM_CHAIN_IDS.has(chainId)
}

export function isSwapSupportedNetwork(
  network?: Pick<Network, 'coinType' | 'id' | 'runtimeModelId' | 'chainId' | 'capabilities' | 'supportsAssets'> | null
): boolean {
  return Boolean(network?.id) && !isSwapTestnetNetwork(network) && isSwapActionEnabledNetwork(network)
}

export function extractServerSwapEnabledNetworkIds(payload: unknown): Set<string> {
  const items = Array.isArray(asRecord(payload).items) ? asRecord(payload).items as unknown[] : []
  const out = new Set<string>()

  for (const row of items) {
    const item = asRecord(row)
    const networkId = normalizeSwapCapabilityNetworkId(
      item.chainKey
      || item.networkId
      || item.sourceNetworkId
      || item.destinationNetworkId
      || ''
    )
    if (!networkId) continue
    if (item.supportsSwap === false) continue
    out.add(networkId)
  }

  return out
}

export function isServerSwapEnabledNetwork(
  network: Pick<Network, 'id' | 'runtimeModelId' | 'chainId'> | null | undefined,
  payload: unknown
): boolean {
  if (!network?.id) return false
  if (isSwapTestnetNetwork(network)) return false
  const enabledIds = extractServerSwapEnabledNetworkIds(payload)
  const directId = normalizeSwapCapabilityNetworkId(network.id)
  const modelId = normalizeSwapCapabilityNetworkId(network.runtimeModelId)
  return enabledIds.has(directId) || (modelId ? enabledIds.has(modelId) : false)
}

export function isCatalogAssetSwappable(
  item: ServerCoinCatalogItem,
  network?: Pick<Network, 'coinType' | 'id'> | null
): boolean {
  if (!isSwapSupportedNetwork(network)) return false
  if (item.enabled !== true) return false
  if (normalizeText(item.walletCatalogState) === 'blocked') return false
  if (item.kind === 'main') {
    return true
  }
  return (
    network?.coinType !== 'EVM'
    || EVM_CONTRACT_RE.test(String(item.contractAddress || '').trim())
  )
}

export function buildSwappableCatalogIdentitySet(items: ServerCoinCatalogItem[], networkId: string): Set<string> {
  const out = new Set<string>()
  const normalizedNetworkId = normalizeText(networkId)

  for (const item of items) {
    if (item.kind === 'main') {
      out.add(`native:${normalizedNetworkId}`)
      continue
    }
    const contract = normalizeText(item.contractAddress)
    if (EVM_CONTRACT_RE.test(contract)) {
      out.add(contract)
    }
  }

  return out
}

export function isWalletAssetSwappable(
  item: SendableItem,
  network?: Pick<Network, 'coinType' | 'id'> | null,
  supportedCatalogIdentities?: Set<string>
): boolean {
  if (!isSwapSupportedNetwork(network)) return false
  if (item.kind === 'nft') return false
  if (item.kind === 'native') {
    return true
  }

  const contract = extractSwapContractAddress(item.assetId)
  if (contract && supportedCatalogIdentities?.has(contract)) return true

  const assetId = normalizeText(item.assetId)
  if (assetId && supportedCatalogIdentities?.has(assetId)) return true
  return !supportedCatalogIdentities || supportedCatalogIdentities.size === 0
}
