import { parseAssetScript } from './assetScript'
import { equalBytes } from './bytes'
import type { Transaction } from './transaction'

export interface TxEffect {
  /** Net native coin change for the address, in satoshis. */
  rtmDelta: bigint
  /** Net change per asset ID, in atomic units. */
  assetDeltas: Record<string, bigint>
  /** Counterparty addresses' scripts are not resolved; only whether we spent. */
  spentFromUs: boolean
}

const NULL_TXID = '0'.repeat(64)

/**
 * Computes what a transaction did to one P2PKH script. Inputs are resolved by
 * fetching the transactions they spend; `fetchTx` may return null for a
 * transaction outside the address history, whose outputs cannot be ours.
 */
export async function describeTx(
  tx: Transaction,
  ownScript: Uint8Array,
  fetchTx: (txid: string) => Promise<Transaction | null>
): Promise<TxEffect> {
  let rtmDelta = 0n
  const assetDeltas: Record<string, bigint> = {}
  let spentFromUs = false

  const apply = (script: Uint8Array, value: bigint, sign: 1n | -1n): boolean => {
    if (equalBytes(script, ownScript)) {
      rtmDelta += sign * value
      return true
    }
    let asset = null
    try {
      asset = parseAssetScript(script)
    } catch {
      asset = null
    }
    if (asset && equalBytes(asset.recipientScript, ownScript)) {
      assetDeltas[asset.assetId] = (assetDeltas[asset.assetId] ?? 0n) + sign * asset.amount
      return true
    }
    return false
  }

  for (const output of tx.outputs) apply(output.script, output.value, 1n)

  for (const input of tx.inputs) {
    if (input.txid === NULL_TXID) continue
    const prev = await fetchTx(input.txid)
    if (!prev) continue
    const spent = prev.outputs[input.vout]
    if (spent && apply(spent.script, spent.value, -1n)) spentFromUs = true
  }

  for (const [assetId, delta] of Object.entries(assetDeltas)) {
    if (delta === 0n) delete assetDeltas[assetId]
  }
  return { rtmDelta, assetDeltas, spentFromUs }
}

/** Block timestamp from a header (hex); nTime is at byte 68 of Bitcoin-style headers. */
export function headerTime(headerHex: string, timeOffset = 68): number {
  const bytes = headerHex.slice(timeOffset * 2, timeOffset * 2 + 8)
  if (bytes.length !== 8) return 0
  const le = bytes.match(/../g)!.reverse().join('')
  return Number.parseInt(le, 16) * 1000
}
