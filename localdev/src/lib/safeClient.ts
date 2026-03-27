import { ethers } from 'ethers'
import {
  normalizeSafeAddress,
  normalizeSafeBytes,
  normalizeSafeOperation,
  normalizeSafeServiceUrl,
  normalizeSafeSignatureHex,
  normalizeSafeTransactionInput,
  packSafeConfirmations,
  SAFE_TRANSACTION_SERVICE_TIMEOUT_MS,
  SafeAccountInfo,
  SafeAdapterError,
  SafeAdapterOptions,
  SafeHashSigner,
  SafeServiceConfirmation,
  SafeTransactionData,
  SafeTransactionInput,
  SafeTransactionRecord,
  sortSafeConfirmations,
  toSafeQuantityString,
  ZERO_ADDRESS
} from './safeTypes'

const SAFE_CONTRACT_ABI = [
  'function getOwners() view returns (address[])',
  'function getThreshold() view returns (uint256)',
  'function nonce() view returns (uint256)',
  'function VERSION() view returns (string)',
  'function getTransactionHash(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,uint256 _nonce) view returns (bytes32)',
  'function isOwner(address owner) view returns (bool)',
  'function execTransaction(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,bytes signatures) returns (bool success)'
] as const

function joinServiceUrl(baseUrl: string, path: string): string {
  const root = normalizeSafeServiceUrl(baseUrl)
  const normalizedPath = String(path || '').replace(/^\/+/, '')
  if (!root) throw new SafeAdapterError('invalid_service_url', 'Safe transaction service URL is not configured')
  return new URL(normalizedPath, `${root}/`).toString()
}

async function fetchJson(
  fetchFn: typeof fetch,
  url: string,
  init?: RequestInit,
  timeoutMs = SAFE_TRANSACTION_SERVICE_TIMEOUT_MS
): Promise<{ ok: boolean; status: number; json: unknown; text: string }> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null
  try {
    const response = await fetchFn(url, {
      ...init,
      signal: controller ? controller.signal : init?.signal
    })
    const text = await response.text().catch(() => '')
    let json: unknown = null
    if (text) {
      try {
        json = JSON.parse(text)
      } catch {
        json = null
      }
    }
    return { ok: response.ok, status: response.status, json, text }
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') {
      throw new SafeAdapterError('http_error', `Safe service request timed out after ${timeoutMs}ms: ${url}`, { cause: error })
    }
    throw new SafeAdapterError('http_error', `Safe service request failed: ${url}`, { cause: error })
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

function parseArrayEnvelope<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[]
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>
    if (Array.isArray(record.results)) return record.results as T[]
    if (Array.isArray(record.items)) return record.items as T[]
    if (Array.isArray(record.data)) return record.data as T[]
  }
  return []
}

function parseSafeConfirmationList(raw: unknown): SafeServiceConfirmation[] {
  const out: SafeServiceConfirmation[] = []
  for (const row of parseArrayEnvelope<unknown>(raw)) {
    if (!row || typeof row !== 'object') continue
    const record = row as Record<string, unknown>
    const owner = String(record.owner ?? record.signer ?? record.address ?? '').trim()
    const signature = String(record.signature ?? record.signatureHex ?? '').trim()
    if (!owner || !signature) continue
    out.push({
      owner: ethers.getAddress(owner),
      signature: normalizeSafeSignatureHex(signature),
      submittedBy: record.submittedBy ? String(record.submittedBy).trim() : undefined,
      confirmationDate: (record.confirmationDate ?? record.created ?? record.createdAt ?? null) as string | number | null,
      signatureType: record.signatureType ? String(record.signatureType).trim() : undefined
    })
  }
  return out
}

function parseSafeTransactionRecord(raw: unknown): SafeTransactionRecord {
  const record = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const txData = (record.safeTransactionData && typeof record.safeTransactionData === 'object')
    ? record.safeTransactionData as Record<string, unknown>
    : record
  const confirmations = parseSafeConfirmationList(record.confirmations ?? txData.confirmations)
  const safeTxHash = String(record.safeTxHash ?? record.safe_tx_hash ?? record.txHash ?? record.transactionHash ?? '').trim()
  if (!safeTxHash) {
    throw new SafeAdapterError('http_error', 'Safe service response is missing safeTxHash', { details: raw })
  }
  return {
    safeTxHash,
    to: normalizeSafeAddress(String(txData.to ?? ZERO_ADDRESS)),
    value: toSafeQuantityString(txData.value as any, 0n),
    data: normalizeSafeBytes(txData.data ?? '0x'),
    operation: normalizeSafeOperation(txData.operation),
    safeTxGas: toSafeQuantityString(txData.safeTxGas as any, 0n),
    baseGas: toSafeQuantityString(txData.baseGas as any, 0n),
    gasPrice: toSafeQuantityString(txData.gasPrice as any, 0n),
    gasToken: String(txData.gasToken ?? ZERO_ADDRESS).trim() || ZERO_ADDRESS,
    refundReceiver: String(txData.refundReceiver ?? ZERO_ADDRESS).trim() || ZERO_ADDRESS,
    nonce: toSafeQuantityString(txData.nonce as any, 0n),
    confirmationsRequired: typeof record.confirmationsRequired === 'number'
      ? record.confirmationsRequired
      : (typeof record.confirmationsRequired === 'string' && /^\d+$/.test(record.confirmationsRequired) ? Number(record.confirmationsRequired) : undefined),
    confirmations: confirmations.length > 0 ? confirmations : undefined,
    isExecuted: Boolean(record.isExecuted ?? record.executed ?? record.executionDate ?? record.txHash),
    txHash: String(record.txHash ?? record.transactionHash ?? '').trim() || undefined,
    executedAt: (record.executionDate ?? record.executedAt ?? null) as string | number | null,
    submittedBy: (record.sender ?? record.submittedBy ?? null) as string | null
  }
}

function appendJsonHeaders(init?: RequestInit): HeadersInit {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(init?.headers || {})
  }
}

function normalizeTransactionEnvelope(input: SafeTransactionInput, nonce: bigint | number | string): SafeTransactionData {
  return normalizeSafeTransactionInput({ ...input, nonce }, nonce)
}

export class SafeContractClient {
  readonly provider: ethers.Provider
  readonly safeAddress: string
  readonly contract: ethers.Contract

  constructor(provider: ethers.Provider, safeAddress: string) {
    this.provider = provider
    this.safeAddress = normalizeSafeAddress(safeAddress)
    this.contract = new ethers.Contract(this.safeAddress, SAFE_CONTRACT_ABI, provider)
  }

  async getSafeAccountInfo(): Promise<SafeAccountInfo> {
    const [network, code, owners, threshold, nonce, version] = await Promise.all([
      this.provider.getNetwork(),
      this.provider.getCode(this.safeAddress),
      this.contract.getOwners().catch(() => []),
      this.contract.getThreshold().catch(() => null),
      this.contract.nonce().catch(() => null),
      this.contract.VERSION().catch(() => null)
    ])

    return {
      address: this.safeAddress,
      chainId: typeof network.chainId === 'bigint' ? Number(network.chainId) : Number(network.chainId || 0),
      deployed: Boolean(code && code !== '0x'),
      version: version ? String(version).trim() : null,
      owners: Array.isArray(owners) ? owners.map((owner) => ethers.getAddress(String(owner))) : [],
      threshold: threshold === null ? null : Number(threshold),
      nonce: nonce === null ? null : ethers.toBigInt(nonce)
    }
  }

  async isOwner(address: string): Promise<boolean> {
    const normalized = normalizeSafeAddress(address)
    try {
      return Boolean(await this.contract.isOwner(normalized))
    } catch {
      const info = await this.getSafeAccountInfo()
      return info.owners.some((owner) => owner.toLowerCase() === normalized.toLowerCase())
    }
  }

  async getSafeTransactionHash(input: SafeTransactionInput, nonce?: bigint | number | string): Promise<string> {
    const safeInfo = await this.getSafeAccountInfo()
    const normalized = normalizeTransactionEnvelope(input, nonce ?? safeInfo.nonce ?? 0n)
    const txHash = await this.contract.getTransactionHash(
      normalized.to,
      normalized.value,
      normalized.data,
      normalized.operation,
      normalized.safeTxGas,
      normalized.baseGas,
      normalized.gasPrice,
      normalized.gasToken,
      normalized.refundReceiver,
      normalized.nonce
    )
    return ethers.hexlify(txHash)
  }

  async buildExecTransactionRequest(
    input: SafeTransactionInput,
    signatures: string,
    nonce?: bigint | number | string
  ): Promise<ethers.TransactionRequest> {
    const safeInfo = await this.getSafeAccountInfo()
    const normalized = normalizeTransactionEnvelope(input, nonce ?? safeInfo.nonce ?? 0n)
    const data = this.contract.interface.encodeFunctionData('execTransaction', [
      normalized.to,
      normalized.value,
      normalized.data,
      normalized.operation,
      normalized.safeTxGas,
      normalized.baseGas,
      normalized.gasPrice,
      normalized.gasToken,
      normalized.refundReceiver,
      signatures
    ])
    return {
      to: this.safeAddress,
      data,
      value: 0n
    }
  }
}

export class SafeTransactionServiceClient {
  readonly baseUrl: string
  readonly fetchFn: typeof fetch
  readonly timeoutMs: number

  constructor(options: SafeAdapterOptions) {
    this.baseUrl = normalizeSafeServiceUrl(options.serviceUrl || '')
    this.fetchFn = options.fetchFn || fetch
    this.timeoutMs = options.timeoutMs ?? SAFE_TRANSACTION_SERVICE_TIMEOUT_MS
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    if (!this.baseUrl) {
      throw new SafeAdapterError('invalid_service_url', 'Safe transaction service URL is not configured')
    }
    const url = joinServiceUrl(this.baseUrl, path)
    const response = await fetchJson(this.fetchFn, url, init, this.timeoutMs)
    if (!response.ok) {
      if (response.status === 404) {
        throw new SafeAdapterError('safe_not_found', `Safe service returned HTTP 404 for ${url}`, {
          status: response.status,
          details: response.text || response.json
        })
      }
      throw new SafeAdapterError('http_error', `Safe service request failed [HTTP ${response.status}] for ${url}`, {
        status: response.status,
        details: response.text || response.json
      })
    }
    return response.json as T
  }

  async getSafeInfo(safeAddress: string): Promise<unknown> {
    return await this.request(`safes/${normalizeSafeAddress(safeAddress)}/`)
  }

  async listTransactions(safeAddress: string): Promise<SafeTransactionRecord[]> {
    const payload = await this.request<unknown>(`safes/${normalizeSafeAddress(safeAddress)}/multisig-transactions/`)
    return parseArrayEnvelope<unknown>(payload).map((row) => parseSafeTransactionRecord(row))
  }

  async listPendingTransactions(safeAddress: string): Promise<SafeTransactionRecord[]> {
    return (await this.listTransactions(safeAddress)).filter((tx) => !tx.isExecuted)
  }

  async getTransaction(safeTxHash: string): Promise<SafeTransactionRecord> {
    const payload = await this.request<unknown>(`multisig-transactions/${String(safeTxHash || '').trim()}/`)
    return parseSafeTransactionRecord(payload)
  }

  async getConfirmations(safeTxHash: string): Promise<SafeServiceConfirmation[]> {
    const payload = await this.request<unknown>(`multisig-transactions/${String(safeTxHash || '').trim()}/confirmations/`)
    return sortSafeConfirmations(parseSafeConfirmationList(payload))
  }

  async proposeTransaction(input: {
    safeAddress: string
    safeTransaction: SafeTransactionData
    safeTxHash: string
    senderAddress: string
    senderSignature: string
  }): Promise<unknown> {
    const payload = {
      safe: normalizeSafeAddress(input.safeAddress),
      safeTxHash: String(input.safeTxHash || '').trim(),
      senderAddress: normalizeSafeAddress(input.senderAddress),
      signature: normalizeSafeSignatureHex(input.senderSignature),
      senderSignature: normalizeSafeSignatureHex(input.senderSignature),
      safeTransactionData: input.safeTransaction
    }
    return await this.request(`safes/${normalizeSafeAddress(input.safeAddress)}/multisig-transactions/`, {
      method: 'POST',
      headers: appendJsonHeaders(),
      body: JSON.stringify(payload)
    })
  }

  async confirmTransaction(input: {
    safeTxHash: string
    safeAddress: string
    senderAddress: string
    senderSignature: string
  }): Promise<unknown> {
    const payload = {
      safeTxHash: String(input.safeTxHash || '').trim(),
      senderAddress: normalizeSafeAddress(input.senderAddress),
      signature: normalizeSafeSignatureHex(input.senderSignature),
      senderSignature: normalizeSafeSignatureHex(input.senderSignature)
    }
    return await this.request(`multisig-transactions/${String(input.safeTxHash || '').trim()}/confirmations/`, {
      method: 'POST',
      headers: appendJsonHeaders(),
      body: JSON.stringify(payload)
    })
  }

  async approveHash(input: {
    safeTxHash: string
    senderAddress: string
    senderSignature: string
  }): Promise<unknown> {
    return await this.request(`multisig-transactions/${String(input.safeTxHash || '').trim()}/confirmations/`, {
      method: 'POST',
      headers: appendJsonHeaders(),
      body: JSON.stringify({
        signature: normalizeSafeSignatureHex(input.senderSignature),
        senderAddress: normalizeSafeAddress(input.senderAddress),
        senderSignature: normalizeSafeSignatureHex(input.senderSignature)
      })
    })
  }
}

export function createSafeContractClient(provider: ethers.Provider, safeAddress: string): SafeContractClient {
  return new SafeContractClient(provider, safeAddress)
}

export function createSafeTransactionServiceClient(options: SafeAdapterOptions): SafeTransactionServiceClient {
  return new SafeTransactionServiceClient(options)
}

export async function signSafeHash(
  signer: SafeHashSigner,
  safeTxHash: string
): Promise<string> {
  const signature = await signer.signHash(ethers.hexlify(ethers.getBytes(safeTxHash)))
  return normalizeSafeSignatureHex(signature)
}

export function packSafeExecutionSignatures(confirmations: readonly SafeServiceConfirmation[]): string {
  return packSafeConfirmations(confirmations)
}

export function buildSafeTransactionRecord(
  input: SafeTransactionInput,
  nonce: bigint | number | string,
  safeTxHash: string,
  confirmations?: SafeServiceConfirmation[]
): SafeTransactionRecord {
  const tx = normalizeTransactionEnvelope(input, nonce)
  return {
    ...tx,
    safeTxHash: String(safeTxHash || '').trim(),
    confirmations: confirmations?.length ? sortSafeConfirmations(confirmations) : undefined
  }
}
