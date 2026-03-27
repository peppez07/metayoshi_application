import { ethers } from 'ethers'

export type SafeOperation = 0 | 1

export type SafeAdapterErrorCode =
  | 'invalid_safe_address'
  | 'invalid_service_url'
  | 'invalid_transaction_input'
  | 'invalid_signature'
  | 'rpc_error'
  | 'http_error'
  | 'safe_not_found'
  | 'not_safe_owner'
  | 'insufficient_confirmations'
  | 'unsupported_operation'
  | 'execution_failed'

export class SafeAdapterError extends Error {
  readonly code: SafeAdapterErrorCode
  readonly status?: number
  readonly details?: unknown

  constructor(
    code: SafeAdapterErrorCode,
    message: string,
    options?: { status?: number; details?: unknown; cause?: unknown }
  ) {
    super(message)
    this.name = 'SafeAdapterError'
    this.code = code
    this.status = options?.status
    this.details = options?.details
    if (options?.cause !== undefined) {
      ;(this as Error & { cause?: unknown }).cause = options.cause
    }
  }
}

export interface SafeTransactionInput {
  to: string
  value?: bigint | number | string
  data?: string
  operation?: SafeOperation | number | string
  safeTxGas?: bigint | number | string
  baseGas?: bigint | number | string
  gasPrice?: bigint | number | string
  gasToken?: string
  refundReceiver?: string
  nonce?: bigint | number | string
}

export interface SafeTransactionData {
  to: string
  value: string
  data: string
  operation: SafeOperation
  safeTxGas: string
  baseGas: string
  gasPrice: string
  gasToken: string
  refundReceiver: string
  nonce: string
}

export interface SafeServiceConfirmation {
  owner: string
  signature: string
  submittedBy?: string | null
  confirmationDate?: string | number | null
  signatureType?: string | null
}

export interface SafeTransactionRecord extends SafeTransactionData {
  safeTxHash: string
  confirmationsRequired?: number
  confirmations?: SafeServiceConfirmation[]
  isExecuted?: boolean
  txHash?: string
  executedAt?: string | number | null
  submittedBy?: string | null
}

export interface SafeAccountInfo {
  address: string
  chainId: number | null
  deployed: boolean
  version: string | null
  owners: string[]
  threshold: number | null
  nonce: bigint | null
}

export interface SafeProposalResult {
  safeTxHash: string
  transaction: SafeTransactionRecord
  proposal: unknown
  signature: string
}

export interface SafeConfirmationResult {
  safeTxHash: string
  signature: string
  confirmation: unknown
}

export interface SafeExecutionResult {
  safeTxHash: string
  hash: string
  transaction: ethers.TransactionRequest
  signatures: string
}

export interface SafeHashSigner {
  address: string
  signHash: (hash: string) => Promise<string>
}

export interface SafeExecutionSigner {
  address?: string
  sendTransaction: (transaction: ethers.TransactionRequest) => Promise<ethers.TransactionResponse | { hash?: string }>
}

export interface SafeAdapterOptions {
  provider: ethers.Provider
  safeAddress: string
  serviceUrl?: string
  fetchFn?: typeof fetch
  timeoutMs?: number
}

export const ZERO_ADDRESS = ethers.ZeroAddress
export const SAFE_DEFAULT_OPERATION: SafeOperation = 0
export const SAFE_ZERO_HASH = `0x${'00'.repeat(32)}`
export const SAFE_TRANSACTION_SERVICE_TIMEOUT_MS = 15_000

export function normalizeSafeAddress(value: string): string {
  const text = String(value || '').trim()
  if (!ethers.isAddress(text)) {
    throw new SafeAdapterError('invalid_safe_address', `Invalid Safe address: ${text || '<empty>'}`)
  }
  return ethers.getAddress(text)
}

export function normalizeSafeServiceUrl(value: string): string {
  const text = String(value || '').trim()
  if (!text) return ''
  if (!/^https?:\/\//i.test(text)) {
    throw new SafeAdapterError('invalid_service_url', `Invalid Safe service URL: ${text}`)
  }
  try {
    const parsed = new URL(text)
    return parsed.toString().replace(/\/+$/, '')
  } catch (error) {
    throw new SafeAdapterError('invalid_service_url', `Invalid Safe service URL: ${text}`, { cause: error })
  }
}

export function normalizeSafeOperation(value: unknown): SafeOperation {
  if (value === 1 || value === '1' || String(value || '').trim().toLowerCase() === 'delegatecall') return 1
  if (value === 0 || value === '0' || String(value || '').trim().toLowerCase() === 'call') return 0
  if (value === undefined || value === null || String(value || '').trim() === '') return 0
  throw new SafeAdapterError('unsupported_operation', `Unsupported Safe operation: ${String(value)}`)
}

export function normalizeSafeBytes(value: unknown): string {
  const text = String(value ?? '').trim()
  if (!text) return '0x'
  if (!/^0x([0-9a-f]{2})*$/i.test(text)) {
    throw new SafeAdapterError('invalid_transaction_input', `Safe transaction data must be 0x-prefixed hex: ${text}`)
  }
  return ethers.hexlify(text)
}

export function toSafeBigInt(value: bigint | number | string | undefined, fallback = 0n): bigint {
  if (value === undefined || value === null || String(value).trim() === '') return fallback
  try {
    return ethers.toBigInt(value)
  } catch (error) {
    throw new SafeAdapterError('invalid_transaction_input', `Invalid Safe quantity: ${String(value)}`, { cause: error })
  }
}

export function toSafeQuantityString(value: bigint | number | string | undefined, fallback = 0n): string {
  return toSafeBigInt(value, fallback).toString()
}

export function normalizeSafeTransactionInput(input: SafeTransactionInput, nonceFallback?: bigint | number | string): SafeTransactionData {
  const to = normalizeSafeAddress(input.to)
  return {
    to,
    value: toSafeQuantityString(input.value, 0n),
    data: normalizeSafeBytes(input.data),
    operation: normalizeSafeOperation(input.operation),
    safeTxGas: toSafeQuantityString(input.safeTxGas, 0n),
    baseGas: toSafeQuantityString(input.baseGas, 0n),
    gasPrice: toSafeQuantityString(input.gasPrice, 0n),
    gasToken: input.gasToken && String(input.gasToken).trim() ? normalizeSafeAddress(String(input.gasToken)) : ZERO_ADDRESS,
    refundReceiver: input.refundReceiver && String(input.refundReceiver).trim()
      ? normalizeSafeAddress(String(input.refundReceiver))
      : ZERO_ADDRESS,
    nonce: toSafeQuantityString(input.nonce, toSafeBigInt(nonceFallback, 0n))
  }
}

export function normalizeSafeSignatureHex(value: string): string {
  const text = String(value || '').trim()
  if (!text) {
    throw new SafeAdapterError('invalid_signature', 'Safe signature is missing')
  }
  if (!/^0x([0-9a-f]{2})+$/i.test(text)) {
    throw new SafeAdapterError('invalid_signature', `Safe signature must be 0x-prefixed hex: ${text}`)
  }
  return ethers.hexlify(text)
}

export function sortSafeConfirmations(confirmations: readonly SafeServiceConfirmation[]): SafeServiceConfirmation[] {
  return [...confirmations].sort((left, right) => {
    const a = String(left.owner || '').trim().toLowerCase()
    const b = String(right.owner || '').trim().toLowerCase()
    return a.localeCompare(b)
  })
}

export function packSafeConfirmations(confirmations: readonly SafeServiceConfirmation[]): string {
  return sortSafeConfirmations(confirmations)
    .map((confirmation) => normalizeSafeSignatureHex(confirmation.signature))
    .join('')
}
