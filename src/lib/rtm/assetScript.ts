/**
 * Raptoreum Core 2.0.3.01 asset transfer scripts.
 *
 * Canonical builder output, as accepted by ElectrumX `parse_asset_script`:
 *   <P2PKH script> OP_RTM_ASSET(0xbc) <push "rtm" ‖ varstr(asset_id) ‖ u8 unique_flag
 *   ‖ [u64 unique_id] ‖ i64 amount> OP_DROP(0x75)
 */
import { ByteReader, bytesToHex, concatBytes, equalBytes, i64LE, pushData, u64LE, utf8, varBytes } from './bytes'
import { COIN } from './address'

export const OP_RTM_ASSET = 0xbc
export const OP_DROP = 0x75
export const MAX_MONEY = 21_000_000_000n * COIN

const RTM_MARKER = utf8('rtm')

export interface AssetTransferData {
  assetId: string
  amount: bigint
  uniqueId: bigint | null
}

export interface ParsedAssetScript extends AssetTransferData {
  recipientScript: Uint8Array
  canonical: boolean
}

export function isValidAssetId(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value)
}

function isP2pkh(script: Uint8Array): boolean {
  return script.length === 25 && script[0] === 0x76 && script[1] === 0xa9 && script[2] === 0x14
    && script[23] === 0x88 && script[24] === 0xac
}

export function buildAssetTransferScript(recipientScript: Uint8Array, data: AssetTransferData): Uint8Array {
  if (!isP2pkh(recipientScript)) throw new Error('Asset outputs require a P2PKH (R...) destination')
  if (!isValidAssetId(data.assetId)) throw new Error('Invalid asset ID')
  if (data.amount <= 0n || data.amount > MAX_MONEY) throw new Error('Asset amount out of range')
  if (data.uniqueId !== null && data.amount % COIN !== 0n) {
    throw new Error('Unique asset amounts must be whole tokens')
  }
  if (data.uniqueId !== null && data.uniqueId + data.amount / COIN > 1n << 64n) {
    throw new Error('Unique asset range overflows')
  }
  const payload = concatBytes(
    RTM_MARKER,
    varBytes(utf8(data.assetId)),
    data.uniqueId === null ? Uint8Array.of(0) : concatBytes(Uint8Array.of(1), u64LE(data.uniqueId)),
    i64LE(data.amount)
  )
  return concatBytes(recipientScript, Uint8Array.of(OP_RTM_ASSET), pushData(payload), Uint8Array.of(OP_DROP))
}

/** Mirrors the server parser; returns null for scripts that are not asset transfers. */
export function parseAssetScript(script: Uint8Array): ParsedAssetScript | null {
  if (script.length <= 31 || script[25] !== OP_RTM_ASSET) return null
  let start: number
  if (script[27] === 0x72) {
    if (!equalBytes(script.slice(27, 30), RTM_MARKER)) return null
    start = 30
  } else if (equalBytes(script.slice(28, 31), RTM_MARKER)) {
    start = 31
  } else {
    return null
  }
  const reader = new ByteReader(script.slice(start))
  const assetId = new TextDecoder('utf-8', { fatal: true }).decode(reader.varBytes())
  if (!isValidAssetId(assetId)) throw new Error('Invalid asset ID in script')
  const uniqueFlag = reader.u8()
  const uniqueId = uniqueFlag ? reader.u64() : null
  const amount = reader.i64()
  if (amount < 0n || amount > MAX_MONEY) throw new Error('Asset amount out of range')
  const recipientScript = concatBytes(Uint8Array.of(0x76, 0xa9, 0x14), script.slice(3, 23), Uint8Array.of(0x88, 0xac))
  let canonical = false
  try {
    canonical = equalBytes(script, buildAssetTransferScript(recipientScript, { assetId, amount, uniqueId }))
  } catch {
    canonical = false
  }
  return { assetId, amount, uniqueId, recipientScript, canonical }
}

export function describeAssetScript(script: Uint8Array): string {
  const parsed = parseAssetScript(script)
  return parsed ? `${parsed.assetId}:${parsed.amount}` : bytesToHex(script)
}
