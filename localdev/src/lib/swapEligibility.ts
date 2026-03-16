import type { Network } from '../coins'
import type { ServerCoinCatalogItem } from '../coins/serverRegistry/types'
import type { SendableItem } from '../store/walletStore'
import {
  isSwapMatrixSupportedAsset,
  isSwapMatrixSupportedNetworkId
} from './swapSupportMatrix'

const EVM_CONTRACT_RE = /^0x[a-f0-9]{40}$/i

function normalizeText(value: unknown): string {
  return String(value || '').trim().toLowerCase()
}

export function extractSwapContractAddress(assetId?: string): string | undefined {
  const raw = String(assetId || '').trim()
  const match = raw.match(/0x[a-fA-F0-9]{40}/)
  return match ? match[0].toLowerCase() : undefined
}

export function isSwapSupportedNetwork(network?: Pick<Network, 'coinType' | 'id'> | null): boolean {
  if (!network?.id) return false
  if (network.coinType !== 'EVM' && network.coinType !== 'SOL') return false
  return isSwapMatrixSupportedNetworkId(network.id)
}

export function isCatalogAssetSwappable(
  item: ServerCoinCatalogItem,
  network?: Pick<Network, 'coinType' | 'id'> | null
): boolean {
  if (!isSwapSupportedNetwork(network)) return false
  if (item.enabled !== true) return false
  if (normalizeText(item.walletCatalogState) === 'blocked') return false
  if (item.kind === 'main') {
    return isSwapMatrixSupportedAsset(network?.id, item.symbol, 'native')
  }
  return (
    isSwapMatrixSupportedAsset(network?.id, item.symbol, 'fungible')
    && (
      network?.coinType !== 'EVM'
      || EVM_CONTRACT_RE.test(String(item.contractAddress || '').trim())
    )
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
    return isSwapMatrixSupportedAsset(network?.id, item.symbol, 'native')
  }
  if (!isSwapMatrixSupportedAsset(network?.id, item.symbol, 'fungible')) return false

  const contract = extractSwapContractAddress(item.assetId)
  if (contract && supportedCatalogIdentities?.has(contract)) return true

  const assetId = normalizeText(item.assetId)
  if (assetId && supportedCatalogIdentities?.has(assetId)) return true
  return !supportedCatalogIdentities || supportedCatalogIdentities.size === 0
}
