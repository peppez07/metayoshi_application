import { ethers } from 'ethers'
import { DEFAULT_PUBLIC_API_BASE_URL, resolvePublicApiBaseUrl } from './apiBase'
import { discoverWalletBackend } from './backendHelp'
import { DEFAULT_WALLET_SERVER_TIMEOUT_MS } from './serverTimeouts'
import { getSecureBridgeSessionInfo, type UtxoRpcConfig } from './utxoRpc'
import type {
  SafeExecutionResult,
  SafeInfoResult,
  SafeOwnerConfirmation,
  SafeOwnerSigner,
  SafePendingTransactionSummary,
  SafeProposalResult,
  SafeTransactionDetails,
  SafeWalletTx
} from './safe'

const APP_API_KEY = String((import.meta as any)?.env?.VITE_APP_API_KEY || '').trim()
const SAFE_EXEC_IFACE = new ethers.Interface([
  'function execTransaction(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,bytes signatures) payable returns (bool success)'
])

export const SAFE_MULTISIG_SUPPORTED_CHAIN_IDS = [1, 10, 100, 137, 8453, 42161, 43114] as const
const SAFE_MULTISIG_SUPPORTED_CHAIN_ID_SET = new Set<number>(SAFE_MULTISIG_SUPPORTED_CHAIN_IDS)

type JsonResponse = {
  ok: boolean
  status: number
  json: any
  text: string
}

export function isSupportedSafeMultisigChainId(value: unknown): boolean {
  const parsed = typeof value === 'number' ? value : Number(String(value || '').trim())
  return Number.isInteger(parsed) && parsed > 0 && SAFE_MULTISIG_SUPPORTED_CHAIN_ID_SET.has(parsed)
}

function readString(value: unknown): string {
  return String(value ?? '').trim()
}

function readNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const raw = readString(value)
  if (!raw) return fallback
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeSafeAddress(value: unknown): string {
  return ethers.getAddress(readString(value))
}

function normalizeSafeValue(value: unknown): string {
  const raw = readString(value || '0')
  if (!raw) return '0'
  if (/^\d+$/.test(raw)) return raw
  if (/^0x[0-9a-f]+$/i.test(raw)) return BigInt(raw).toString()
  return BigInt(raw).toString()
}

function normalizeDataHex(value: unknown): string {
  const raw = readString(value)
  if (!raw) return '0x'
  if (!/^0x([0-9a-f]{2})*$/i.test(raw)) {
    throw new Error('Safe transaction data must be 0x-prefixed hex')
  }
  return raw
}

function normalizeSafeWalletTx(value: Record<string, unknown>): SafeWalletTx {
  return {
    to: normalizeSafeAddress(value.to),
    value: normalizeSafeValue(value.value),
    data: normalizeDataHex(value.data),
    operation: Math.max(0, Math.trunc(readNumber(value.operation, 0))),
    safeTxGas: normalizeSafeValue(value.safeTxGas),
    baseGas: normalizeSafeValue(value.baseGas),
    gasPrice: normalizeSafeValue(value.gasPrice),
    gasToken: readString(value.gasToken) ? normalizeSafeAddress(value.gasToken) : ethers.ZeroAddress,
    refundReceiver: readString(value.refundReceiver) ? normalizeSafeAddress(value.refundReceiver) : ethers.ZeroAddress,
    nonce: Math.max(0, Math.trunc(readNumber(value.nonce, 0)))
  }
}

function sortConfirmations(confirmations: SafeOwnerConfirmation[]): SafeOwnerConfirmation[] {
  return [...confirmations].sort((a, b) => a.owner.toLowerCase().localeCompare(b.owner.toLowerCase()))
}

function joinSignatures(confirmations: SafeOwnerConfirmation[]): string {
  const hexParts = sortConfirmations(confirmations).map((entry) => ethers.hexlify(entry.signature as ethers.BytesLike).replace(/^0x/, ''))
  return `0x${hexParts.join('')}`
}

async function resolveMultisigApiOrigin(preferredBase?: string): Promise<string> {
  const discovery = await discoverWalletBackend(preferredBase).catch(() => null)
  return discovery?.helpOrigin || resolvePublicApiBaseUrl(preferredBase) || DEFAULT_PUBLIC_API_BASE_URL
}

async function fetchJsonWithStatus(url: string, init: RequestInit, timeoutMs = DEFAULT_WALLET_SERVER_TIMEOUT_MS): Promise<JsonResponse> {
  const controller = new AbortController()
  const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      ...init,
      signal: init.signal ?? controller.signal
    })
    const text = await response.text().catch(() => '')
    let json: any = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      json = null
    }
    return {
      ok: response.ok,
      status: response.status,
      json,
      text
    }
  } finally {
    globalThis.clearTimeout(timer)
  }
}

async function fetchMultisigServerJson(
  rpcConfig: UtxoRpcConfig,
  path: string,
  init: RequestInit
): Promise<any> {
  const session = await getSecureBridgeSessionInfo(rpcConfig)
  const apiOrigin = await resolveMultisigApiOrigin(session.apiBase)
  const url = `${apiOrigin.replace(/\/+$/, '')}${path}`
  const response = await fetchJsonWithStatus(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${session.token}`,
      ...(APP_API_KEY ? { 'X-API-Key': APP_API_KEY } : {}),
      ...(init.headers as Record<string, string> | undefined)
    }
  }, Number(rpcConfig.timeoutMs ?? DEFAULT_WALLET_SERVER_TIMEOUT_MS))
  if (!response.ok) {
    const detail = readString(response.json?.details || response.json?.error || response.text || `HTTP ${response.status}`)
    throw new Error(detail || `Multisig server request failed (${response.status})`)
  }
  if (response.json?.ok === false) {
    throw new Error(readString(response.json?.details || response.json?.error || 'Multisig server request failed'))
  }
  return response.json ?? {}
}

function normalizeSafeDetailsResponse(payload: Record<string, unknown>): SafeTransactionDetails {
  return {
    safeTxHash: readString(payload.safeTxHash),
    nonce: readNumber(payload.nonce),
    to: readString(payload.to),
    value: normalizeSafeValue(payload.value),
    data: typeof payload.data === 'string' ? payload.data : null,
    confirmationsSubmitted: readNumber(payload.confirmationsSubmitted),
    confirmationsRequired: readNumber(payload.confirmationsRequired),
    executed: Boolean(payload.executed),
    transactionHash: readString(payload.transactionHash) || null,
    confirmations: Array.isArray(payload.confirmations)
      ? payload.confirmations
          .map((entry) => ({
            owner: readString((entry as any)?.owner),
            signature: readString((entry as any)?.signature)
          }))
          .filter((entry) => Boolean(entry.owner && entry.signature))
      : [],
    operation: readNumber(payload.operation),
    safeTxGas: normalizeSafeValue(payload.safeTxGas),
    baseGas: normalizeSafeValue(payload.baseGas),
    gasPrice: normalizeSafeValue(payload.gasPrice),
    gasToken: readString(payload.gasToken) ? normalizeSafeAddress(payload.gasToken) : ethers.ZeroAddress,
    refundReceiver: readString(payload.refundReceiver) ? normalizeSafeAddress(payload.refundReceiver) : ethers.ZeroAddress
  }
}

export async function fetchSafeInfoFromServer(params: {
  chainId: number
  safeAddress: string
  rpcConfig: UtxoRpcConfig
}): Promise<SafeInfoResult> {
  if (!isSupportedSafeMultisigChainId(params.chainId)) {
    throw new Error('unsupported_safe_chain')
  }
  const safeAddress = normalizeSafeAddress(params.safeAddress)
  const payload = await fetchMultisigServerJson(
    params.rpcConfig,
    `/v1/multisig/evm/safe/state?chainId=${encodeURIComponent(String(params.chainId))}&safeAddress=${encodeURIComponent(safeAddress)}`,
    { method: 'GET' }
  ) as Record<string, unknown>
  return {
    safeAddress: normalizeSafeAddress(payload.safeAddress || safeAddress),
    owners: Array.isArray(payload.owners) ? payload.owners.map((entry) => normalizeSafeAddress(entry)) : [],
    threshold: readNumber(payload.threshold),
    nonce: readNumber(payload.nonce),
    pendingProposalCount: readNumber(payload.pendingProposalCount),
    serviceUrl: readString(payload.serviceUrl) || null
  }
}

export async function listSafePendingTransactionsFromServer(params: {
  chainId: number
  safeAddress: string
  rpcConfig: UtxoRpcConfig
}): Promise<SafePendingTransactionSummary[]> {
  const safeAddress = normalizeSafeAddress(params.safeAddress)
  const payload = await fetchMultisigServerJson(
    params.rpcConfig,
    `/v1/multisig/evm/safe/pending?chainId=${encodeURIComponent(String(params.chainId))}&safeAddress=${encodeURIComponent(safeAddress)}`,
    { method: 'GET' }
  ) as { items?: Array<Record<string, unknown>> }
  return Array.isArray(payload.items)
    ? payload.items.map((row) => ({
        safeTxHash: readString(row.safeTxHash),
        nonce: readNumber(row.nonce),
        to: readString(row.to),
        value: normalizeSafeValue(row.value),
        data: typeof row.data === 'string' ? row.data : null,
        confirmationsSubmitted: readNumber(row.confirmationsSubmitted),
        confirmationsRequired: readNumber(row.confirmationsRequired),
        executed: Boolean(row.executed),
        transactionHash: readString(row.transactionHash) || null
      }))
    : []
}

export async function prepareSafeTransactionFromServer(params: {
  chainId: number
  safeAddress: string
  tx: SafeWalletTx
  rpcConfig: UtxoRpcConfig
}): Promise<{
  tx: SafeWalletTx
  safeTxHash: string
  typedData: {
    domain: Record<string, unknown>
    types: Record<string, unknown>
    value: Record<string, unknown>
  }
  currentSafeState: {
    owners: string[]
    threshold: number
    nonce: number
    version?: string | null
    masterCopy?: string | null
  }
}> {
  const payload = await fetchMultisigServerJson(params.rpcConfig, '/v1/multisig/evm/safe/prepare', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chainId: params.chainId,
      safeAddress: normalizeSafeAddress(params.safeAddress),
      tx: params.tx
    })
  }) as Record<string, unknown>
  return {
    tx: normalizeSafeWalletTx((payload.tx as Record<string, unknown>) ?? {}),
    safeTxHash: readString(payload.safeTxHash),
    typedData: {
      domain: ((payload.typedData as any)?.domain ?? {}) as Record<string, unknown>,
      types: ((payload.typedData as any)?.types ?? {}) as Record<string, unknown>,
      value: ((payload.typedData as any)?.value ?? {}) as Record<string, unknown>
    },
    currentSafeState: {
      owners: Array.isArray((payload.currentSafeState as any)?.owners)
        ? ((payload.currentSafeState as any).owners as unknown[]).map((entry) => normalizeSafeAddress(entry))
        : [],
      threshold: readNumber((payload.currentSafeState as any)?.threshold),
      nonce: readNumber((payload.currentSafeState as any)?.nonce),
      version: readString((payload.currentSafeState as any)?.version) || null,
      masterCopy: readString((payload.currentSafeState as any)?.masterCopy) || null
    }
  }
}

export async function getSafeTransactionDetailsFromServer(params: {
  chainId: number
  safeAddress: string
  safeTxHash: string
  rpcConfig: UtxoRpcConfig
}): Promise<SafeTransactionDetails & {
  tx: SafeWalletTx
  typedData: {
    domain: Record<string, unknown>
    types: Record<string, unknown>
    value: Record<string, unknown>
  }
}> {
  const safeAddress = normalizeSafeAddress(params.safeAddress)
  const safeTxHash = readString(params.safeTxHash)
  const payload = await fetchMultisigServerJson(
    params.rpcConfig,
    `/v1/multisig/evm/safe/tx/${encodeURIComponent(safeTxHash)}?chainId=${encodeURIComponent(String(params.chainId))}&safeAddress=${encodeURIComponent(safeAddress)}`,
    { method: 'GET' }
  ) as Record<string, unknown>
  return {
    ...normalizeSafeDetailsResponse(payload),
    tx: normalizeSafeWalletTx((payload.tx as Record<string, unknown>) ?? {}),
    typedData: {
      domain: ((payload.typedData as any)?.domain ?? {}) as Record<string, unknown>,
      types: ((payload.typedData as any)?.types ?? {}) as Record<string, unknown>,
      value: ((payload.typedData as any)?.value ?? {}) as Record<string, unknown>
    }
  }
}

export async function proposeSafeTransactionFromServer(params: {
  chainId: number
  safeAddress: string
  tx: SafeWalletTx
  rpcConfig: UtxoRpcConfig
  signer: SafeOwnerSigner
  origin?: string
}): Promise<SafeProposalResult> {
  const prepared = await prepareSafeTransactionFromServer({
    chainId: params.chainId,
    safeAddress: params.safeAddress,
    tx: params.tx,
    rpcConfig: params.rpcConfig
  })
  const ownerAddress = normalizeSafeAddress(params.signer.address)
  const signature = await params.signer.signTypedData(prepared.typedData.domain, prepared.typedData.types, prepared.typedData.value)
  const payload = await fetchMultisigServerJson(params.rpcConfig, '/v1/multisig/evm/safe/propose', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chainId: params.chainId,
      safeAddress: normalizeSafeAddress(params.safeAddress),
      tx: prepared.tx,
      ownerAddress,
      signature,
      origin: readString(params.origin) || 'MetaYoshi Wallet'
    })
  }) as Record<string, unknown>
  return {
    safeTxHash: readString(payload.safeTxHash),
    nonce: readNumber(payload.nonce),
    serviceUrl: readString(payload.serviceUrl) || null
  }
}

export async function confirmSafeTransactionFromServer(params: {
  chainId: number
  safeAddress: string
  safeTxHash: string
  rpcConfig: UtxoRpcConfig
  signer: SafeOwnerSigner
}): Promise<SafeProposalResult> {
  const details = await getSafeTransactionDetailsFromServer({
    chainId: params.chainId,
    safeAddress: params.safeAddress,
    safeTxHash: params.safeTxHash,
    rpcConfig: params.rpcConfig
  })
  const ownerAddress = normalizeSafeAddress(params.signer.address)
  const signature = await params.signer.signTypedData(details.typedData.domain, details.typedData.types, details.typedData.value)
  const payload = await fetchMultisigServerJson(params.rpcConfig, '/v1/multisig/evm/safe/confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chainId: params.chainId,
      safeAddress: normalizeSafeAddress(params.safeAddress),
      safeTxHash: readString(params.safeTxHash),
      ownerAddress,
      signature
    })
  }) as Record<string, unknown>
  return {
    safeTxHash: readString(payload.safeTxHash),
    nonce: readNumber(payload.nonce),
    serviceUrl: readString(payload.serviceUrl) || null
  }
}

export async function relaySafeExecutionFromServer(params: {
  chainId: number
  safeAddress: string
  signedTxHex: string
  rpcConfig: UtxoRpcConfig
}): Promise<{ txid: string }> {
  const payload = await fetchMultisigServerJson(params.rpcConfig, '/v1/multisig/evm/safe/relay', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chainId: params.chainId,
      safeAddress: normalizeSafeAddress(params.safeAddress),
      signedTxHex: readString(params.signedTxHex)
    })
  }) as Record<string, unknown>
  const txid = readString(payload.txid)
  if (!txid) throw new Error('Multisig relay response is missing txid')
  return { txid }
}

export async function executeSafeTransactionViaServer(params: {
  chainId: number
  safeAddress: string
  safeTxHash: string
  rpcConfig: UtxoRpcConfig
  signer: SafeOwnerSigner
  signRawTransaction?: (tx: Record<string, unknown>) => Promise<string>
  relayFallback?: (input: {
    to: string
    valueWei: bigint
    data?: string
    gasLimit?: bigint
    gasPrice?: bigint
    maxFeePerGas?: bigint
    maxPriorityFeePerGas?: bigint
    type?: 2
  }) => Promise<{ hash: string }>
}): Promise<SafeExecutionResult> {
  const details = await getSafeTransactionDetailsFromServer({
    chainId: params.chainId,
    safeAddress: params.safeAddress,
    safeTxHash: params.safeTxHash,
    rpcConfig: params.rpcConfig
  })
  if (details.executed && details.transactionHash) {
    return {
      safeTxHash: details.safeTxHash,
      nonce: details.nonce,
      serviceUrl: null,
      hash: details.transactionHash
    }
  }

  const ownerAddress = normalizeSafeAddress(params.signer.address)
  const alreadySigned = details.confirmations.some((entry) => entry.owner.toLowerCase() === ownerAddress.toLowerCase())
  let confirmations = details.confirmations
  if (!alreadySigned) {
    const signature = await params.signer.signTypedData(details.typedData.domain, details.typedData.types, details.typedData.value)
    confirmations = [...details.confirmations, { owner: ownerAddress, signature }]
  }

  const execData = SAFE_EXEC_IFACE.encodeFunctionData('execTransaction', [
    normalizeSafeAddress(details.to),
    BigInt(normalizeSafeValue(details.value)),
    normalizeDataHex(details.data || '0x'),
    details.operation,
    BigInt(normalizeSafeValue(details.safeTxGas)),
    BigInt(normalizeSafeValue(details.baseGas)),
    BigInt(normalizeSafeValue(details.gasPrice)),
    details.gasToken || ethers.ZeroAddress,
    details.refundReceiver || ethers.ZeroAddress,
    joinSignatures(confirmations)
  ])

  if (params.signRawTransaction) {
    const signedTxHex = await params.signRawTransaction({
      to: normalizeSafeAddress(params.safeAddress),
      value: 0n,
      data: execData,
      chainId: params.chainId
    })
    const relayed = await relaySafeExecutionFromServer({
      chainId: params.chainId,
      safeAddress: params.safeAddress,
      signedTxHex,
      rpcConfig: params.rpcConfig
    })
    return {
      safeTxHash: details.safeTxHash,
      nonce: details.nonce,
      serviceUrl: null,
      hash: relayed.txid
    }
  }

  if (!params.relayFallback) {
    throw new Error('owner_signer_missing')
  }

  const direct = await params.relayFallback({
    to: normalizeSafeAddress(params.safeAddress),
    valueWei: 0n,
    data: execData
  })
  return {
    safeTxHash: details.safeTxHash,
    nonce: details.nonce,
    serviceUrl: null,
    hash: readString(direct.hash)
  }
}
