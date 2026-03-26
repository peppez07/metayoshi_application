import type { UtxoRpcConfig } from './utxoRpc'
import { callBridgeMethod } from './utxoRpc'

function toBase64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 1) out += String.fromCharCode(bytes[i])
  return btoa(out)
}

function parseSolanaRpcNumber(value: unknown, label: string): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid Solana ${label} response`)
  }
  return Math.trunc(parsed)
}

export const SOLANA_ASSOCIATED_TOKEN_ACCOUNT_RENT_LAMPORTS = 2_039_280

export async function getSolanaLatestBlockhash(rpcConfig: UtxoRpcConfig): Promise<{
  blockhash: string
  lastValidBlockHeight: number
}> {
  const result = await callBridgeMethod(rpcConfig, 'getLatestBlockhash', [{ commitment: 'confirmed' }])
  const blockhash = String((result as any)?.value?.blockhash || (result as any)?.blockhash || '').trim()
  const lastValidBlockHeight = parseSolanaRpcNumber(
    (result as any)?.value?.lastValidBlockHeight ?? (result as any)?.lastValidBlockHeight ?? 0,
    'latest blockhash'
  )
  if (!blockhash) throw new Error('Solana bridge returned no blockhash')
  return { blockhash, lastValidBlockHeight }
}

export async function getSolanaFeeForCompiledMessage(
  rpcConfig: UtxoRpcConfig,
  compiledMessageBytes: Uint8Array
): Promise<number> {
  const result = await callBridgeMethod(rpcConfig, 'getFeeForMessage', [
    toBase64(compiledMessageBytes),
    { commitment: 'confirmed' }
  ])
  const feeLamports = (result as any)?.value ?? result
  return parseSolanaRpcNumber(feeLamports, 'fee quote')
}

export async function getSolanaParsedAccountInfo(
  rpcConfig: UtxoRpcConfig,
  address: string
): Promise<any | null> {
  const result = await callBridgeMethod(rpcConfig, 'getAccountInfo', [
    String(address || '').trim(),
    { encoding: 'jsonParsed', commitment: 'confirmed' }
  ])
  return (result as any)?.value ?? null
}

export async function getSolanaAccountInfo(
  rpcConfig: UtxoRpcConfig,
  address: string
): Promise<any | null> {
  const result = await callBridgeMethod(rpcConfig, 'getAccountInfo', [
    String(address || '').trim(),
    { encoding: 'base64', commitment: 'confirmed' }
  ])
  return (result as any)?.value ?? null
}

export async function getSolanaParsedTokenAccountsByOwner(
  rpcConfig: UtxoRpcConfig,
  ownerAddress: string,
  programId: string
): Promise<any[]> {
  const result = await callBridgeMethod(rpcConfig, 'getTokenAccountsByOwner', [
    String(ownerAddress || '').trim(),
    { programId: String(programId || '').trim() },
    { encoding: 'jsonParsed', commitment: 'confirmed' }
  ])
  return Array.isArray((result as any)?.value) ? (result as any).value : []
}

export async function getSolanaSignatureStatus(
  rpcConfig: UtxoRpcConfig,
  signature: string
): Promise<any | null> {
  const result = await callBridgeMethod(rpcConfig, 'getSignatureStatuses', [
    [String(signature || '').trim()],
    { searchTransactionHistory: true }
  ])
  const rows = Array.isArray((result as any)?.value) ? (result as any).value : []
  return rows[0] ?? null
}

export async function waitForSolanaSignatureConfirmation(
  rpcConfig: UtxoRpcConfig,
  signature: string,
  timeoutMs = 20_000
): Promise<void> {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const status = await getSolanaSignatureStatus(rpcConfig, signature)
    if (status?.err) {
      throw new Error(`Solana transaction failed: ${JSON.stringify(status.err)}`)
    }
    const confirmationStatus = String(status?.confirmationStatus || '').trim().toLowerCase()
    if (confirmationStatus === 'confirmed' || confirmationStatus === 'finalized') return
    await new Promise((resolve) => setTimeout(resolve, 800))
  }
  throw new Error('Timed out waiting for Solana confirmation from MetaYoshi bridge')
}
