import { ethers } from 'ethers'
import { resolveSafeServiceUrl } from './safeConfig'

export interface SafeWalletTx {
  to: string
  value: string
  data: string
  operation: number
  safeTxGas: string
  baseGas: string
  gasPrice: string
  gasToken: string
  refundReceiver: string
  nonce: number
}

export interface SafeInfoResult {
  safeAddress: string
  owners: string[]
  threshold: number
  nonce: number
  pendingProposalCount: number
  serviceUrl: string | null
}

export interface SafePendingTransactionSummary {
  safeTxHash: string
  nonce: number
  to: string
  value: string
  data: string | null
  confirmationsSubmitted: number
  confirmationsRequired: number
  executed: boolean
  transactionHash?: string | null
}

export interface SafeOwnerConfirmation {
  owner: string
  signature: string
}

export interface SafeTransactionDetails extends SafePendingTransactionSummary {
  confirmations: SafeOwnerConfirmation[]
  operation: number
  safeTxGas: string
  baseGas: string
  gasPrice: string
  gasToken: string
  refundReceiver: string
}

export interface SafeProposalResult {
  safeTxHash: string
  nonce: number
  serviceUrl: string | null
}

export interface SafeExecutionResult extends SafeProposalResult {
  hash: string
}

export interface SafeRpcAdapter {
  call: (method: string, params: unknown[]) => Promise<unknown>
  relaySignedTx: (signedTxHex: string) => Promise<{ txid: string }>
}

export interface SafeOwnerSigner {
  address: string
  signTypedData: (domain: Record<string, unknown>, types: Record<string, unknown>, value: Record<string, unknown>) => Promise<string>
  sendTransaction: (input: {
    to: string
    valueWei: bigint
    data?: string
    gasLimit?: bigint
    gasPrice?: bigint
    maxFeePerGas?: bigint
    maxPriorityFeePerGas?: bigint
    type?: 2
  }) => Promise<{ hash: string }>
  signTransaction?: (tx: Record<string, unknown>) => Promise<string>
}

const SAFE_ABI = [
  'function getOwners() view returns (address[])',
  'function getThreshold() view returns (uint256)',
  'function nonce() view returns (uint256)',
  'function getTransactionHash(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,uint256 _nonce) view returns (bytes32)',
  'function execTransaction(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,bytes signatures) payable returns (bool success)'
]

const SAFE_TX_TYPES = {
  SafeTx: [
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'data', type: 'bytes' },
    { name: 'operation', type: 'uint8' },
    { name: 'safeTxGas', type: 'uint256' },
    { name: 'baseGas', type: 'uint256' },
    { name: 'gasPrice', type: 'uint256' },
    { name: 'gasToken', type: 'address' },
    { name: 'refundReceiver', type: 'address' },
    { name: 'nonce', type: 'uint256' }
  ]
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

function normalizeSafeAddress(value: string): string {
  return ethers.getAddress(String(value || '').trim())
}

function buildSafeServiceUrl(chainId: number): string | null {
  if (!Number.isInteger(chainId) || chainId <= 0) return null
  return resolveSafeServiceUrl(chainId, (import.meta as any)?.env || {})
}

function encodeApiPath(baseUrl: string | null, path: string): string | null {
  if (!baseUrl) return null
  return `${baseUrl}/api/v1${path}`
}

async function fetchJson(input: string, init?: RequestInit): Promise<any> {
  const response = await fetch(input, init)
  const text = await response.text()
  let parsed: any = null
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    parsed = null
  }
  if (!response.ok) {
    const detail = String(parsed?.detail || parsed?.nonFieldErrors?.[0] || parsed?.message || text || response.statusText || 'request failed').trim()
    throw new Error(detail || `Safe service request failed (${response.status})`)
  }
  return parsed
}

function normalizeSafeValue(value: unknown): string {
  const text = String(value ?? '0').trim()
  if (!text) return '0'
  if (/^\d+$/.test(text)) return text
  if (/^0x[0-9a-f]+$/i.test(text)) return BigInt(text).toString()
  return BigInt(text).toString()
}

function normalizeData(value: unknown): string {
  const text = String(value || '').trim()
  if (!text) return '0x'
  if (!/^0x([0-9a-f]{2})*$/i.test(text)) throw new Error('Safe transaction data must be 0x-prefixed hex')
  return text
}

function sortConfirmations(confirmations: SafeOwnerConfirmation[]): SafeOwnerConfirmation[] {
  return [...confirmations].sort((a, b) => a.owner.toLowerCase().localeCompare(b.owner.toLowerCase()))
}

function joinSignatures(confirmations: SafeOwnerConfirmation[]): string {
  const normalized = sortConfirmations(confirmations).map((item) => ethers.hexlify(item.signature as ethers.BytesLike))
  return `0x${normalized.map((item) => item.replace(/^0x/, '')).join('')}`
}

async function readContractValue<T>(rpc: SafeRpcAdapter, callData: string): Promise<T> {
  return await rpc.call('eth_call', [{ data: callData }, 'latest']) as T
}

async function readSafeNonce(rpc: SafeRpcAdapter, safeAddress: string): Promise<number> {
  const iface = new ethers.Interface(SAFE_ABI)
  const raw = await rpc.call('eth_call', [{ to: safeAddress, data: iface.encodeFunctionData('nonce', []) }, 'latest'])
  const [nonce] = iface.decodeFunctionResult('nonce', String(raw || '0x'))
  return Number(nonce)
}

export async function fetchSafeInfo(params: {
  chainId: number
  safeAddress: string
  rpc: SafeRpcAdapter
}): Promise<SafeInfoResult> {
  const safeAddress = normalizeSafeAddress(params.safeAddress)
  const serviceUrl = buildSafeServiceUrl(params.chainId)
  const iface = new ethers.Interface(SAFE_ABI)
  const ownersRaw = await params.rpc.call('eth_call', [{ to: safeAddress, data: iface.encodeFunctionData('getOwners', []) }, 'latest'])
  const thresholdRaw = await params.rpc.call('eth_call', [{ to: safeAddress, data: iface.encodeFunctionData('getThreshold', []) }, 'latest'])
  const [owners] = iface.decodeFunctionResult('getOwners', String(ownersRaw || '0x'))
  const [threshold] = iface.decodeFunctionResult('getThreshold', String(thresholdRaw || '0x'))
  const nonce = await readSafeNonce(params.rpc, safeAddress)
  let pendingProposalCount = 0

  const listUrl = encodeApiPath(serviceUrl, `/safes/${safeAddress}/multisig-transactions/?executed=false&trusted=true`)
  if (listUrl) {
    try {
      const result = await fetchJson(listUrl)
      pendingProposalCount = Array.isArray(result?.results) ? result.results.length : 0
    } catch {
      pendingProposalCount = 0
    }
  }

  return {
    safeAddress,
    owners: Array.isArray(owners) ? owners.map((owner: unknown) => normalizeSafeAddress(String(owner || ''))) : [],
    threshold: Number(threshold),
    nonce,
    pendingProposalCount,
    serviceUrl
  }
}

export async function listSafePendingTransactions(params: {
  chainId: number
  safeAddress: string
}): Promise<SafePendingTransactionSummary[]> {
  const safeAddress = normalizeSafeAddress(params.safeAddress)
  const serviceUrl = buildSafeServiceUrl(params.chainId)
  const listUrl = encodeApiPath(serviceUrl, `/safes/${safeAddress}/multisig-transactions/?executed=false&trusted=true`)
  if (!listUrl) return []
  const result = await fetchJson(listUrl)
  const rows = Array.isArray(result?.results) ? result.results : []
  return rows.map((row: any) => ({
    safeTxHash: String(row?.safeTxHash || '').trim(),
    nonce: Number(row?.nonce || 0),
    to: String(row?.to || '').trim(),
    value: normalizeSafeValue(row?.value),
    data: typeof row?.data === 'string' ? row.data : null,
    confirmationsSubmitted: Number(row?.confirmationsSubmitted || 0),
    confirmationsRequired: Number(row?.confirmationsRequired || 0),
    executed: Boolean(row?.isExecuted),
    transactionHash: String(row?.transactionHash || '').trim() || null
  }))
}

export async function getSafeTransactionDetails(params: {
  chainId: number
  safeTxHash: string
}): Promise<SafeTransactionDetails> {
  const serviceUrl = buildSafeServiceUrl(params.chainId)
  const url = encodeApiPath(serviceUrl, `/multisig-transactions/${String(params.safeTxHash || '').trim()}/`)
  if (!url) throw new Error('Safe service is not configured for this chain')
  const row = await fetchJson(url)
  return {
    safeTxHash: String(row?.safeTxHash || '').trim(),
    nonce: Number(row?.nonce || 0),
    to: String(row?.to || '').trim(),
    value: normalizeSafeValue(row?.value),
    data: typeof row?.data === 'string' ? row.data : null,
    confirmationsSubmitted: Number(row?.confirmationsSubmitted || 0),
    confirmationsRequired: Number(row?.confirmationsRequired || 0),
    executed: Boolean(row?.isExecuted),
    transactionHash: String(row?.transactionHash || '').trim() || null,
    confirmations: Array.isArray(row?.confirmations)
      ? row.confirmations
          .map((entry: any) => ({
            owner: String(entry?.owner || '').trim(),
            signature: String(entry?.signature || '').trim()
          }))
          .filter((entry: SafeOwnerConfirmation) => Boolean(entry.owner && entry.signature))
      : [],
    operation: Number(row?.operation || 0),
    safeTxGas: normalizeSafeValue(row?.safeTxGas),
    baseGas: normalizeSafeValue(row?.baseGas),
    gasPrice: normalizeSafeValue(row?.gasPrice),
    gasToken: String(row?.gasToken || ZERO_ADDRESS).trim() || ZERO_ADDRESS,
    refundReceiver: String(row?.refundReceiver || ZERO_ADDRESS).trim() || ZERO_ADDRESS
  }
}

export async function buildSafeTypedDataSignature(params: {
  signer: SafeOwnerSigner
  chainId: number
  safeAddress: string
  tx: SafeWalletTx
}): Promise<string> {
  const domain = {
    chainId: params.chainId,
    verifyingContract: normalizeSafeAddress(params.safeAddress)
  }
  const value = {
    to: normalizeSafeAddress(params.tx.to),
    value: normalizeSafeValue(params.tx.value),
    data: normalizeData(params.tx.data),
    operation: params.tx.operation,
    safeTxGas: normalizeSafeValue(params.tx.safeTxGas),
    baseGas: normalizeSafeValue(params.tx.baseGas),
    gasPrice: normalizeSafeValue(params.tx.gasPrice),
    gasToken: params.tx.gasToken || ZERO_ADDRESS,
    refundReceiver: params.tx.refundReceiver || ZERO_ADDRESS,
    nonce: params.tx.nonce
  }
  return await params.signer.signTypedData(domain, SAFE_TX_TYPES, value)
}

export async function calculateSafeTxHash(params: {
  rpc: SafeRpcAdapter
  safeAddress: string
  tx: SafeWalletTx
}): Promise<string> {
  const safeAddress = normalizeSafeAddress(params.safeAddress)
  const iface = new ethers.Interface(SAFE_ABI)
  const raw = await params.rpc.call('eth_call', [{
    to: safeAddress,
    data: iface.encodeFunctionData('getTransactionHash', [
      normalizeSafeAddress(params.tx.to),
      BigInt(normalizeSafeValue(params.tx.value)),
      normalizeData(params.tx.data),
      params.tx.operation,
      BigInt(normalizeSafeValue(params.tx.safeTxGas)),
      BigInt(normalizeSafeValue(params.tx.baseGas)),
      BigInt(normalizeSafeValue(params.tx.gasPrice)),
      params.tx.gasToken || ZERO_ADDRESS,
      params.tx.refundReceiver || ZERO_ADDRESS,
      BigInt(params.tx.nonce)
    ])
  }, 'latest'])
  const [safeTxHash] = iface.decodeFunctionResult('getTransactionHash', String(raw || '0x'))
  return String(safeTxHash || '').trim()
}

export async function proposeSafeTransaction(params: {
  chainId: number
  safeAddress: string
  tx: SafeWalletTx
  rpc: SafeRpcAdapter
  signer: SafeOwnerSigner
  origin?: string
}): Promise<SafeProposalResult> {
  const safeAddress = normalizeSafeAddress(params.safeAddress)
  const serviceUrl = buildSafeServiceUrl(params.chainId)
  if (!serviceUrl) throw new Error('Safe service is not configured for this chain')
  const sender = normalizeSafeAddress(params.signer.address)
  const safeTxHash = await calculateSafeTxHash({
    rpc: params.rpc,
    safeAddress,
    tx: params.tx
  })
  const signature = await buildSafeTypedDataSignature({
    signer: params.signer,
    chainId: params.chainId,
    safeAddress,
    tx: params.tx
  })
  await fetchJson(`${serviceUrl}/api/v1/safes/${safeAddress}/multisig-transactions/`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      safe: safeAddress,
      to: normalizeSafeAddress(params.tx.to),
      value: normalizeSafeValue(params.tx.value),
      data: normalizeData(params.tx.data),
      operation: params.tx.operation,
      safeTxGas: normalizeSafeValue(params.tx.safeTxGas),
      baseGas: normalizeSafeValue(params.tx.baseGas),
      gasPrice: normalizeSafeValue(params.tx.gasPrice),
      gasToken: params.tx.gasToken || ZERO_ADDRESS,
      refundReceiver: params.tx.refundReceiver || ZERO_ADDRESS,
      nonce: params.tx.nonce,
      contractTransactionHash: safeTxHash,
      sender,
      signature,
      origin: params.origin || 'MetaYoshi Wallet'
    })
  })
  return { safeTxHash, nonce: params.tx.nonce, serviceUrl }
}

export async function confirmSafeTransaction(params: {
  chainId: number
  safeAddress: string
  safeTxHash: string
  rpc: SafeRpcAdapter
  signer: SafeOwnerSigner
}): Promise<SafeProposalResult> {
  const safeAddress = normalizeSafeAddress(params.safeAddress)
  const details = await getSafeTransactionDetails({ chainId: params.chainId, safeTxHash: params.safeTxHash })
  const signature = await buildSafeTypedDataSignature({
    signer: params.signer,
    chainId: params.chainId,
    safeAddress,
    tx: {
      to: details.to,
      value: details.value,
      data: details.data || '0x',
      operation: details.operation,
      safeTxGas: details.safeTxGas,
      baseGas: details.baseGas,
      gasPrice: details.gasPrice,
      gasToken: details.gasToken,
      refundReceiver: details.refundReceiver,
      nonce: details.nonce
    }
  })
  const serviceUrl = buildSafeServiceUrl(params.chainId)
  const url = encodeApiPath(serviceUrl, `/multisig-transactions/${String(params.safeTxHash || '').trim()}/confirmations/`)
  if (!url) throw new Error('Safe service is not configured for this chain')
  await fetchJson(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ signature })
  })
  return { safeTxHash: details.safeTxHash, nonce: details.nonce, serviceUrl }
}

export async function executeSafeTransaction(params: {
  chainId: number
  safeAddress: string
  safeTxHash: string
  rpc: SafeRpcAdapter
  signer: SafeOwnerSigner
}): Promise<SafeExecutionResult> {
  const safeAddress = normalizeSafeAddress(params.safeAddress)
  const details = await getSafeTransactionDetails({ chainId: params.chainId, safeTxHash: params.safeTxHash })
  if (details.executed && details.transactionHash) {
    return {
      safeTxHash: details.safeTxHash,
      nonce: details.nonce,
      serviceUrl: buildSafeServiceUrl(params.chainId),
      hash: details.transactionHash
    }
  }

  const ownerAddress = normalizeSafeAddress(params.signer.address)
  const alreadySigned = details.confirmations.some((entry) => entry.owner.toLowerCase() === ownerAddress.toLowerCase())
  let confirmations = details.confirmations
  if (!alreadySigned) {
    const signature = await buildSafeTypedDataSignature({
      signer: params.signer,
      chainId: params.chainId,
      safeAddress,
      tx: {
        to: details.to,
        value: details.value,
        data: details.data || '0x',
        operation: details.operation,
        safeTxGas: details.safeTxGas,
        baseGas: details.baseGas,
        gasPrice: details.gasPrice,
        gasToken: details.gasToken,
        refundReceiver: details.refundReceiver,
        nonce: details.nonce
      }
    })
    confirmations = [...details.confirmations, { owner: ownerAddress, signature }]
  }

  const signatures = joinSignatures(confirmations)
  const iface = new ethers.Interface(SAFE_ABI)
  const execData = iface.encodeFunctionData('execTransaction', [
    normalizeSafeAddress(details.to),
    BigInt(normalizeSafeValue(details.value)),
    normalizeData(details.data),
    details.operation,
    BigInt(normalizeSafeValue(details.safeTxGas)),
    BigInt(normalizeSafeValue(details.baseGas)),
    BigInt(normalizeSafeValue(details.gasPrice)),
    details.gasToken || ZERO_ADDRESS,
    details.refundReceiver || ZERO_ADDRESS,
    signatures
  ])
  const sent = await params.signer.sendTransaction({
    to: safeAddress,
    valueWei: 0n,
    data: execData
  })
  return {
    safeTxHash: details.safeTxHash,
    nonce: details.nonce,
    serviceUrl: buildSafeServiceUrl(params.chainId),
    hash: String(sent.hash || '').trim()
  }
}
