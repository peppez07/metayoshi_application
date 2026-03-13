import type { Network } from '../coins'
import type { UtxoRpcConfig } from './utxoRpc'
import { getSecureBridgeSessionInfo } from './utxoRpc'

export type ServerExecutionMode = 'standard' | 'sponsored' | 'intent'
export type ServerSponsorPreference = 'required' | 'preferred' | 'never'
export type ServerExecutionStatusState =
  | 'quoted'
  | 'submitted'
  | 'broadcasted'
  | 'pending'
  | 'confirmed'
  | 'failed'
  | 'expired'
  | 'rejected'

export interface ServerSwapAssetRef {
  assetId: string
  kind: 'native' | 'fungible' | 'nft'
  symbol?: string
  label?: string
  contractAddress?: string
}

export interface ServerSwapQuoteRequest {
  source: {
    networkId: string
    symbol: string
    address: string
    amount: string
    asset?: ServerSwapAssetRef
  }
  destination: {
    networkId: string
    symbol: string
    address: string
    asset?: ServerSwapAssetRef
  }
  slippageBps: number
  sponsorPreference: ServerSponsorPreference
}

export interface ServerSwapQuote {
  quoteId: string
  mode: ServerExecutionMode
  sourceAmount: string
  destinationAmount: string
  minDestinationAmount: string
  expiresAt: number
  routeSummary: string
  sponsorCoversNetworkFee: boolean
  estimatedNetworkFee?: string
  estimatedNetworkFeeSymbol?: string
  estimatedServerFee?: string
  priceImpactPct?: number | null
  warnings: string[]
  metadata?: Record<string, unknown>
}

export interface ServerSwapApprovalPayload {
  quoteId: string
  sourceNetworkId: string
  sourceSymbol: string
  sourceAssetId?: string
  sourceAssetKind?: string
  sourceContractAddress?: string
  sourceAddress: string
  sourceAmount: string
  destinationNetworkId: string
  destinationSymbol: string
  destinationAssetId?: string
  destinationAssetKind?: string
  destinationContractAddress?: string
  destinationAddress: string
  minDestinationAmount: string
  sponsorPreference: ServerSponsorPreference
  executionMode: ServerExecutionMode
  expiresAt: number
  nonce: string
}

export interface ServerSwapSubmitRequest {
  quoteId: string
  source: ServerSwapQuoteRequest['source']
  destination: ServerSwapQuoteRequest['destination']
  minDestinationAmount: string
  sponsorPreference: ServerSponsorPreference
  executionMode: ServerExecutionMode
  approval: {
    nonce: string
    address: string
    message: string
    signature: string
    signedAt: number
  }
}

export interface ServerExecutionReceipt {
  txid?: string
  explorerUrl?: string
  networkId?: string
}

export interface ServerExecutionStatus {
  executionId: string
  quoteId?: string
  status: ServerExecutionStatusState
  detail?: string
  updatedAt?: number
  receipt?: ServerExecutionReceipt
  warnings: string[]
}

type JsonResponse = {
  ok: boolean
  status: number
  json: any
  text: string
}

type BridgeNetworkInput = Pick<
  Network,
  'id' | 'symbol' | 'rpcUrl' | 'bridgeUrl' | 'bridgeUsername' | 'bridgePassword'
>

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function readString(value: unknown): string {
  return String(value ?? '').trim()
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const text = readString(value)
  if (!text) return undefined
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : undefined
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => readString(item))
    .filter(Boolean)
}

function normalizeExecutionMode(value: unknown): ServerExecutionMode {
  const raw = readString(value).toLowerCase()
  if (raw === 'sponsored' || raw === 'intent') return raw
  return 'standard'
}

function normalizeExecutionStatus(value: unknown): ServerExecutionStatusState {
  const raw = readString(value).toLowerCase()
  switch (raw) {
    case 'submitted':
    case 'broadcasted':
    case 'pending':
    case 'confirmed':
    case 'failed':
    case 'expired':
    case 'rejected':
    case 'quoted':
      return raw
    default:
      return 'pending'
  }
}

function compactErrorText(value: string, maxLen = 220): string {
  const compact = String(value || '').replace(/\s+/g, ' ').trim()
  if (!compact) return ''
  return compact.length > maxLen ? `${compact.slice(0, maxLen)}...` : compact
}

async function fetchJsonWithStatus(url: string, init: RequestInit): Promise<JsonResponse> {
  const response = await fetch(url, init)
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
}

async function executeSecureJsonRequest(
  config: UtxoRpcConfig,
  path: string,
  init: RequestInit
): Promise<any> {
  const session = await getSecureBridgeSessionInfo(config)
  const url = `${session.apiBase}${path}`
  const response = await fetchJsonWithStatus(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
      Authorization: `Bearer ${session.token}`
    }
  })

  if (!response.ok) {
    const detail = readString(response.json?.error || response.json?.message || response.text || `HTTP ${response.status}`)
    throw new Error(`Server execution request failed: ${compactErrorText(detail) || `HTTP ${response.status}`}`)
  }

  return response.json ?? {}
}

function normalizeQuote(raw: unknown, request: ServerSwapQuoteRequest): ServerSwapQuote {
  const source = asRecord(raw)
  const quoteId = readString(source.quoteId || source.id)
  if (!quoteId) throw new Error('Swap quote response is missing quoteId')

  const warnings = readStringArray(source.warnings)
  const destinationAmount = readString(source.destinationAmount || source.toAmount || source.amountOut)
  const minDestinationAmount = readString(source.minDestinationAmount || source.minToAmount || source.amountOutMin)
  const expiresAt = readNumber(source.expiresAt || source.deadline)

  return {
    quoteId,
    mode: normalizeExecutionMode(source.mode || source.executionMode),
    sourceAmount: readString(source.sourceAmount || request.source.amount),
    destinationAmount,
    minDestinationAmount: minDestinationAmount || destinationAmount,
    expiresAt: expiresAt ?? (Date.now() + 60_000),
    routeSummary: readString(source.routeSummary || source.route || source.summary) || 'Server-routed execution',
    sponsorCoversNetworkFee: Boolean(source.sponsorCoversNetworkFee ?? source.sponsored ?? source.gasless),
    estimatedNetworkFee: readString(source.estimatedNetworkFee || source.networkFee),
    estimatedNetworkFeeSymbol: readString(source.estimatedNetworkFeeSymbol || source.networkFeeSymbol),
    estimatedServerFee: readString(source.estimatedServerFee || source.serverFee),
    priceImpactPct: readNumber(source.priceImpactPct ?? source.priceImpact) ?? null,
    warnings,
    metadata: asRecord(source.metadata)
  }
}

function normalizeStatus(raw: unknown): ServerExecutionStatus {
  const source = asRecord(raw)
  const executionId = readString(source.executionId || source.id)
  if (!executionId) throw new Error('Execution status response is missing executionId')

  return {
    executionId,
    quoteId: readString(source.quoteId),
    status: normalizeExecutionStatus(source.status || source.state),
    detail: readString(source.detail || source.message || source.reason) || undefined,
    updatedAt: readNumber(source.updatedAt || source.timestamp || source.checkedAt),
    receipt: {
      txid: readString(source.txid || source.hash || source.receiptTxid) || undefined,
      explorerUrl: readString(source.explorerUrl || source.receiptExplorerUrl) || undefined,
      networkId: readString(source.networkId || source.receiptNetworkId) || undefined
    },
    warnings: readStringArray(source.warnings)
  }
}

export function createServerExecutionRpcConfig(
  network: BridgeNetworkInput,
  secureBridgeSigner: UtxoRpcConfig['secureBridgeSigner']
): UtxoRpcConfig {
  return {
    networkId: network.id,
    coinSymbol: network.symbol,
    rpcUrl: network.rpcUrl,
    bridgeUrl: network.bridgeUrl,
    bridgeUsername: network.bridgeUsername,
    bridgePassword: network.bridgePassword,
    secureBridgeApiBaseUrl: readString(import.meta.env.VITE_SECURE_BRIDGE_API_BASE_URL) || undefined,
    secureBridgeWritesEnabled: true,
    secureBridgeSigner
  }
}

export function buildServerSwapApprovalMessage(payload: ServerSwapApprovalPayload): string {
  return [
    'MetaYoshi server execution approval',
    'version=1',
    'action=swap',
    `quoteId=${payload.quoteId}`,
    `executionMode=${payload.executionMode}`,
    `sourceNetworkId=${payload.sourceNetworkId}`,
    `sourceSymbol=${payload.sourceSymbol}`,
    `sourceAssetId=${readString(payload.sourceAssetId)}`,
    `sourceAssetKind=${readString(payload.sourceAssetKind)}`,
    `sourceContractAddress=${readString(payload.sourceContractAddress)}`,
    `sourceAddress=${payload.sourceAddress}`,
    `sourceAmount=${payload.sourceAmount}`,
    `destinationNetworkId=${payload.destinationNetworkId}`,
    `destinationSymbol=${payload.destinationSymbol}`,
    `destinationAssetId=${readString(payload.destinationAssetId)}`,
    `destinationAssetKind=${readString(payload.destinationAssetKind)}`,
    `destinationContractAddress=${readString(payload.destinationContractAddress)}`,
    `destinationAddress=${payload.destinationAddress}`,
    `minDestinationAmount=${payload.minDestinationAmount}`,
    `sponsorPreference=${payload.sponsorPreference}`,
    `expiresAt=${payload.expiresAt}`,
    `nonce=${payload.nonce}`
  ].join('\n')
}

export function isTerminalServerExecutionStatus(status: ServerExecutionStatusState): boolean {
  return status === 'confirmed' || status === 'failed' || status === 'expired' || status === 'rejected'
}

export async function requestServerSwapQuote(
  config: UtxoRpcConfig,
  request: ServerSwapQuoteRequest
): Promise<ServerSwapQuote> {
  const raw = await executeSecureJsonRequest(config, '/v1/swap/quote', {
    method: 'POST',
    body: JSON.stringify(request)
  })
  return normalizeQuote(raw, request)
}

export async function submitServerSwap(
  config: UtxoRpcConfig,
  request: ServerSwapSubmitRequest
): Promise<ServerExecutionStatus> {
  const raw = await executeSecureJsonRequest(config, '/v1/swap/submit', {
    method: 'POST',
    body: JSON.stringify(request)
  })
  return normalizeStatus(raw)
}

export async function fetchServerExecutionStatus(
  config: UtxoRpcConfig,
  executionId: string
): Promise<ServerExecutionStatus> {
  const normalizedExecutionId = encodeURIComponent(readString(executionId))
  if (!normalizedExecutionId) throw new Error('Execution id is required')
  const raw = await executeSecureJsonRequest(config, `/v1/execute/${normalizedExecutionId}`, {
    method: 'GET'
  })
  return normalizeStatus(raw)
}
