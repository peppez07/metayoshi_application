import { ethers } from 'ethers'

const EVM_TRACKED_ASSET_PATTERNS: RegExp[] = [
  /^evmtoken:(0x[a-fA-F0-9]{40})$/i,
  /^(?:erc20|bep20|contract|token):[^:\s]+:(0x[a-fA-F0-9]{40})$/i,
  /^(?:erc20|bep20|contract|token):(0x[a-fA-F0-9]{40})$/i
]

export function extractEvmTokenAddressFromLogoUri(logoUri: string): string {
  const raw = String(logoUri || '').trim()
  if (!raw) return ''
  const m = raw.match(/\/assets\/(0x[a-fA-F0-9]{40})\/logo\.(?:png|svg|webp|jpg|jpeg)$/i)
  if (!m) return ''
  return ethers.isAddress(m[1]) ? ethers.getAddress(m[1]) : ''
}

export function extractEvmTokenAddressFromAssetId(assetId: string): string {
  const normalized = String(assetId || '').trim()
  if (!normalized) return ''
  if (ethers.isAddress(normalized)) return ethers.getAddress(normalized)
  for (const pattern of EVM_TRACKED_ASSET_PATTERNS) {
    const match = pattern.exec(normalized)
    if (match?.[1] && ethers.isAddress(match[1])) {
      return ethers.getAddress(match[1])
    }
  }
  return ''
}
