import type { Network } from '../coins'
import type { UtxoRpcConfig } from './utxoRpc'
import { getSecureBridgeSessionInfo } from './utxoRpc'
import { useApiMonitorStore } from '../store/apiMonitorStore'

const APP_API_KEY = String((import.meta as any)?.env?.VITE_APP_API_KEY || '').trim()

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

type ServerExecutionAction = 'quote' | 'submit' | 'status'

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

function appendOptionalBridgeBasicAuthHeaders(
  headers: Record<string, string>,
  config: UtxoRpcConfig
): void {
  const username = readString(config.bridgeUsername)
  const password = readString(config.bridgePassword)
  if (!username || !password) return
  headers.Authorization = `Basic ${btoa(`${username}:${password}`)}`
}

function deriveServerExecutionApiBase(config: UtxoRpcConfig): string {
  const explicit = readString(config.secureBridgeApiBaseUrl).replace(/\/+$/, '')
  if (explicit) return explicit

  const bridgeUrl = readString(config.bridgeUrl).replace(/\/+$/, '')
  if (!bridgeUrl) return ''

  const lower = bridgeUrl.toLowerCase()
  const idxV1Bridge = lower.indexOf('/v1/bridge/')
  if (idxV1Bridge >= 0) return bridgeUrl.slice(0, idxV1Bridge)
  const idxBridge = lower.indexOf('/bridge/')
  if (idxBridge >= 0) return bridgeUrl.slice(0, idxBridge)
  if (/\/v1$/i.test(bridgeUrl)) return bridgeUrl.replace(/\/v1$/i, '')
  return bridgeUrl
}

function isServerExecutionAuthDetail(detail: string): boolean {
  const normalized = readString(detail).toLowerCase()
  if (!normalized) return false
  return (
    normalized.includes('api key')
    || normalized.includes('x-api-key')
    || normalized.includes('unauthorized')
    || normalized.includes('auth challenge')
    || normalized.includes('auth verify')
    || normalized.includes('secure bridge signer')
    || normalized.includes('bridge credentials')
  )
}

function makeServerExecutionAuthError(action: 'quote' | 'submit' | 'status'): Error {
  const label = action === 'quote'
    ? 'Swap quote'
    : action === 'submit'
      ? 'Swap submission'
      : 'Swap status'
  return new Error(`${label} is not available because server authentication is misconfigured. This should happen automatically.`)
}

function getServerExecutionMonitorMethod(action: ServerExecutionAction): string {
  switch (action) {
    case 'quote':
      return 'server.swap.quote'
    case 'submit':
      return 'server.swap.submit'
    case 'status':
      return 'server.swap.status'
    default:
      return 'server.swap'
  }
}

function beginServerExecutionMonitor(
  config: UtxoRpcConfig,
  action: ServerExecutionAction,
  url: string
): string {
  return useApiMonitorStore.getState().beginRequest({
    networkId: config.networkId,
    rpcMethod: getServerExecutionMonitorMethod(action),
    url
  })
}

function completeServerExecutionMonitor(requestId: string, httpStatus?: number): void {
  useApiMonitorStore.getState().completeRequest(requestId, { httpStatus })
}

function failServerExecutionMonitor(requestId: string, error: unknown, httpStatus?: number): void {
  const message = error instanceof Error ? error.message : String(error || 'Unknown API error')
  useApiMonitorStore.getState().failRequest(requestId, {
    errorMessage: compactErrorText(message) || 'Unknown API error',
    httpStatus
  })
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
  init: RequestInit,
  action: 'quote' | 'submit' | 'status'
): Promise<any> {
  let session: Awaited<ReturnType<typeof getSecureBridgeSessionInfo>>
  try {
    session = await getSecureBridgeSessionInfo(config)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error || '')
    if (isServerExecutionAuthDetail(detail)) throw makeServerExecutionAuthError(action)
    throw error
  }
  const url = `${session.apiBase}${path}`
  const monitorRequestId = beginServerExecutionMonitor(config, action, url)
  try {
    const response = await fetchJsonWithStatus(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers || {}),
        Authorization: `Bearer ${session.token}`,
        ...(() => {
          const headers: Record<string, string> = {}
          appendOptionalBridgeBasicAuthHeaders(headers, config)
          return headers
        })()
      }
    })

    if (!response.ok) {
      const detail = readString(response.json?.error || response.json?.message || response.text || `HTTP ${response.status}`)
      if (isServerExecutionAuthDetail(detail)) throw makeServerExecutionAuthError(action)
      throw new Error(`Server execution request failed: ${compactErrorText(detail) || `HTTP ${response.status}`}`)
    }

    completeServerExecutionMonitor(monitorRequestId, response.status)
    return response.json ?? {}
  } catch (error) {
    failServerExecutionMonitor(monitorRequestId, error)
    throw error
  }
}

async function tryDirectServerSwapQuote(
  config: UtxoRpcConfig,
  request: ServerSwapQuoteRequest
): Promise<{ kind: 'ok'; json: any } | { kind: 'fallback' }> {
  const apiBase = deriveServerExecutionApiBase(config)
  if (!apiBase) return { kind: 'fallback' }
  const url = `${apiBase}/v1/swap/quote`
  const monitorRequestId = beginServerExecutionMonitor(config, 'quote', url)

  try {
    const response = await fetchJsonWithStatus(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(APP_API_KEY ? { 'X-API-Key': APP_API_KEY } : {}),
        ...(() => {
          const headers: Record<string, string> = {}
          appendOptionalBridgeBasicAuthHeaders(headers, config)
          return headers
        })()
      },
      body: JSON.stringify(request)
    }).catch(() => null)

    if (!response) {
      completeServerExecutionMonitor(monitorRequestId)
      return { kind: 'fallback' }
    }
    if (response.ok) {
      completeServerExecutionMonitor(monitorRequestId, response.status)
      return { kind: 'ok', json: response.json ?? {} }
    }

    const detail = readString(response.json?.error || response.json?.message || response.text || `HTTP ${response.status}`)
    const needsAuthenticatedFallback = (
      response.status === 401
      || response.status === 403
      || response.status === 404
      || response.status === 405
      || response.status === 501
      || isServerExecutionAuthDetail(detail)
    )
    if (needsAuthenticatedFallback) {
      completeServerExecutionMonitor(monitorRequestId)
      return { kind: 'fallback' }
    }

    throw new Error(`Swap quote request failed: ${compactErrorText(detail) || `HTTP ${response.status}`}`)
  } catch (error) {
    failServerExecutionMonitor(monitorRequestId, error)
    throw error
  }
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
  const direct = await tryDirectServerSwapQuote(config, request)
  if (direct.kind === 'ok') return normalizeQuote(direct.json, request)

  const raw = await executeSecureJsonRequest(config, '/v1/swap/quote', {
    method: 'POST',
    body: JSON.stringify(request)
  }, 'quote')
  return normalizeQuote(raw, request)
}

export async function submitServerSwap(
  config: UtxoRpcConfig,
  request: ServerSwapSubmitRequest
): Promise<ServerExecutionStatus> {
  const raw = await executeSecureJsonRequest(config, '/v1/swap/submit', {
    method: 'POST',
    body: JSON.stringify(request)
  }, 'submit')
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
  }, 'status')
  return normalizeStatus(raw)
}
