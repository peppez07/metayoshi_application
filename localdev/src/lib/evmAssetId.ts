import { ethers } from 'ethers'

const EVM_TRACKED_ASSET_PATTERNS: RegExp[] = [
  /^evmtoken:(0x[a-fA-F0-9]{40})$/i,
  /^(?:erc20|bep20|contract|token):[^:\s]+:(0x[a-fA-F0-9]{40})$/i,
  /^(?:erc20|bep20|contract|token):(0x[a-fA-F0-9]{40})$/i
]

export function encodeEvmContractLogoHint(logoUri: string, contractAddress: string): string {
  const base = String(logoUri || '').trim()
  const contract = String(contractAddress || '').trim()
  if (!base || !ethers.isAddress(contract)) return base
  return `${base}#evm-contract=${encodeURIComponent(ethers.getAddress(contract))}`
}

export function extractEvmTokenAddressFromLogoUri(logoUri: string): string {
  const raw = String(logoUri || '').trim()
  if (!raw) return ''
  const idx = raw.indexOf('#evm-contract=')
  if (idx >= 0) {
    const encoded = raw.slice(idx + '#evm-contract='.length)
    try {
      const decoded = decodeURIComponent(encoded).trim()
      if (ethers.isAddress(decoded)) return ethers.getAddress(decoded)
    } catch {
      if (ethers.isAddress(encoded)) return ethers.getAddress(encoded)
    }
  }
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
