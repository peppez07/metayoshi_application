import { ethers } from 'ethers'
import type { Network } from '../coins'
import type { UtxoRpcConfig } from './utxoRpc'
import { callBridgeMethod, getSecureBridgeSessionInfo } from './utxoRpc'
import { getBuildFeatureFlag } from '../buildConfig'
import { useApiMonitorStore } from '../store/apiMonitorStore'

const APP_API_KEY = String((import.meta as any)?.env?.VITE_APP_API_KEY || '').trim()
const DEFAULT_LEGACY_UNISWAP_API_BASE = 'https://trade-api.gateway.uniswap.org/v1'
const UNISWAP_NATIVE_ADDRESS = '0x0000000000000000000000000000000000000000'
const ERC20_METADATA_IFACE = new ethers.Interface(['function decimals() view returns (uint8)'])
const TX_RECEIPT_POLL_MS = 4_000
const TX_RECEIPT_MAX_POLLS = 30

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
  kind: 'native' | 'fungible' | 'wrapped' | 'nft'
  symbol?: string
  label?: string
  contractAddress?: string
  decimals?: number
}

export interface ServerSwapQuoteRequest {
  source: {
    networkId: string
    chainId?: number
    symbol: string
    address: string
    amount: string
    asset?: ServerSwapAssetRef
  }
  destination: {
    networkId: string
    chainId?: number
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
  sourceSymbol?: string
  destinationSymbol?: string
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

export interface ServerSwapSubmitRequest {
  quoteId: string
  source: ServerSwapQuoteRequest['source']
  destination: ServerSwapQuoteRequest['destination']
  minDestinationAmount: string
  sponsorPreference: ServerSponsorPreference
  executionMode: ServerExecutionMode
  quoteMetadata?: Record<string, unknown>
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

export type ServerExecutionRpcConfig = UtxoRpcConfig & {
  chainId?: number
  explorerUrl?: string
  sendTransaction?: (tx: {
    to?: string
    from?: string
    data?: string
    value?: string
    gasLimit?: string
    gasPrice?: string
    maxFeePerGas?: string
    maxPriorityFeePerGas?: string
    chainId?: string | number
  }) => Promise<{ hash: string }>
}

type JsonResponse = {
  ok: boolean
  status: number
  json: any
  text: string
}

type ServerExecutionAction = 'quote' | 'submit' | 'status' | 'approval'

type ServerManagedExecutionAction = 'quote' | 'submit' | 'status'

type BridgeNetworkInput = Pick<
  Network,
  'id' | 'symbol' | 'chainId' | 'rpcUrl' | 'bridgeUrl' | 'bridgeUsername' | 'bridgePassword' | 'explorerUrl'
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
  return value.map((item) => readString(item)).filter(Boolean)
}

function compactErrorText(value: string, maxLen = 220): string {
  const compact = String(value || '').replace(/\s+/g, ' ').trim()
  if (!compact) return ''
  return compact.length > maxLen ? `${compact.slice(0, maxLen)}...` : compact
}

function formatDisplayAmount(value: string): string {
  const normalized = String(value || '').trim()
  if (!normalized) return '0'
  if (!normalized.includes('.')) return normalized
  return normalized.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '')
}

function formatRawTokenAmount(amountRaw: string, decimals: number): string {
  const safeDecimals = Number.isInteger(decimals) && decimals >= 0 && decimals <= 30 ? decimals : 18
  return formatDisplayAmount(ethers.formatUnits(BigInt(readString(amountRaw) || '0'), safeDecimals))
}

function uiAmountToRaw(amount: string, decimals: number): string {
  const safeDecimals = Number.isInteger(decimals) && decimals >= 0 && decimals <= 30 ? decimals : 18
  return ethers.parseUnits(readString(amount) || '0', safeDecimals).toString()
}

function computeMinOutputRaw(amountRaw: string, slippageBps: number): string {
  const raw = BigInt(readString(amountRaw) || '0')
  const safeBps = Math.max(0, Math.min(10_000, Math.trunc(slippageBps)))
  return ((raw * BigInt(10_000 - safeBps)) / 10_000n).toString()
}

function normalizeExecutionStatus(value: unknown): ServerExecutionStatusState {
  switch (readString(value).toUpperCase()) {
    case 'SUCCESS':
      return 'confirmed'
    case 'FAILED':
      return 'failed'
    case 'EXPIRED':
      return 'expired'
    case 'NOT_FOUND':
      return 'pending'
    case 'PENDING':
      return 'pending'
    default:
      return 'pending'
  }
}

function getLegacyUniswapApiBase(): string {
  const explicit = readString((import.meta as any)?.env?.VITE_UNISWAP_API_BASE_URL).replace(/\/+$/, '')
  if (explicit) return explicit
  const legacy = readString((import.meta as any)?.env?.VITE_SECURE_BRIDGE_API_BASE_URL).replace(/\/+$/, '')
  if (legacy) return legacy
  return DEFAULT_LEGACY_UNISWAP_API_BASE
}

function getServerExecutionMonitorMethod(action: ServerExecutionAction): string {
  switch (action) {
    case 'quote':
      return 'swap.quote'
    case 'approval':
      return 'swap.approval'
    case 'submit':
      return 'swap.submit'
    case 'status':
      return 'swap.status'
    default:
      return 'swap'
  }
}

function beginServerExecutionMonitor(
  config: ServerExecutionRpcConfig,
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

async function executeUniswapJsonRequest(
  config: ServerExecutionRpcConfig,
  path: string,
  init: RequestInit,
  action: ServerExecutionAction
): Promise<any> {
  if (!APP_API_KEY) {
    throw new Error('VITE_APP_API_KEY is required for Uniswap swap execution')
  }

  const url = `${getLegacyUniswapApiBase()}${path}`
  const monitorRequestId = beginServerExecutionMonitor(config, action, url)
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': APP_API_KEY,
      ...(init.headers as Record<string, string> | undefined)
    }
    if (action === 'quote' || action === 'submit' || action === 'approval') {
      headers['x-permit2-enabled'] = 'false'
    }

    const response = await fetchJsonWithStatus(url, {
      ...init,
      headers
    })

    if (!response.ok) {
      const detail = readString(
        response.json?.detail
        || response.json?.error
        || response.json?.message
        || response.text
        || `HTTP ${response.status}`
      )
      if (action === 'quote' && response.status === 404) {
        throw new Error('No route is available for the selected swap')
      }
      throw new Error(`Server execution request failed: ${compactErrorText(detail) || `HTTP ${response.status}`}`)
    }

    completeServerExecutionMonitor(monitorRequestId, response.status)
    return response.json ?? {}
  } catch (error) {
    failServerExecutionMonitor(monitorRequestId, error)
    throw error
  }
}

function isSecureUnavailableError(error: unknown): boolean {
  return compactErrorText(error instanceof Error ? error.message : String(error || '')).includes('[secure-bridge-unavailable]')
}

function isSecureBridgeAuthEnabled(): boolean {
  return getBuildFeatureFlag('bridgeSecureWritesEnabled', 'VITE_BRIDGE_SECURE_WRITES_ENABLED', true)
}

function isSecureAuthVerificationError(error: unknown): boolean {
  const normalized = compactErrorText(error instanceof Error ? error.message : String(error || '')).toLowerCase()
  if (!normalized) return false
  return (
    normalized.includes('secure bridge auth challenge failed')
    || normalized.includes('secure bridge auth verify failed')
    || normalized.includes('auth challenge not found or expired')
    || normalized.includes('auth challenge address mismatch')
    || normalized.includes('auth signature verification failed')
    || normalized.includes('signature verifier is not configured')
    || normalized.includes('signature verification failed')
  )
}

function asLegacySwapFallbackError(message: string): Error {
  return new Error(`[legacy-swap-fallback] ${message}`)
}

function isLegacySwapFallbackError(error: unknown): boolean {
  return compactErrorText(error instanceof Error ? error.message : String(error || '')).includes('[legacy-swap-fallback]')
}

function isServerManagedQuoteResponse(raw: unknown): boolean {
  const response = asRecord(raw)
  return Boolean(readString(response.quoteId) && readString(response.mode) && readString(response.destinationAmount))
}

function isLikelyTransactionHash(value: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(readString(value))
}

async function executeServerManagedJsonRequest(
  config: ServerExecutionRpcConfig,
  path: string,
  init: RequestInit,
  action: ServerManagedExecutionAction
): Promise<any> {
  if (!isSecureBridgeAuthEnabled()) {
    throw asLegacySwapFallbackError('Secure bridge auth is disabled in this build')
  }

  let session: { token: string; address: string; apiBase: string }
  try {
    session = await getSecureBridgeSessionInfo(config)
  } catch (error) {
    if (isSecureUnavailableError(error) || isSecureAuthVerificationError(error)) {
      throw asLegacySwapFallbackError(error instanceof Error ? error.message : 'Secure bridge auth is unavailable')
    }
    throw error
  }

  const url = `${session.apiBase}${path}`
  const monitorRequestId = beginServerExecutionMonitor(config, action, url)
  try {
    const response = await fetchJsonWithStatus(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
        ...(APP_API_KEY ? { 'X-API-Key': APP_API_KEY } : {}),
        ...(init.headers as Record<string, string> | undefined)
      }
    })

    if (!response.ok) {
      const detail = readString(
        response.json?.error?.message
        || response.json?.error
        || response.json?.message
        || response.text
        || `HTTP ${response.status}`
      )
      if (response.status === 404 || response.status === 405 || response.status === 501) {
        throw asLegacySwapFallbackError(`Server-managed swap endpoint unavailable: ${compactErrorText(detail) || `HTTP ${response.status}`}`)
      }
      throw new Error(`Server execution request failed: ${compactErrorText(detail) || `HTTP ${response.status}`}`)
    }

    completeServerExecutionMonitor(monitorRequestId, response.status)
    return response.json ?? {}
  } catch (error) {
    failServerExecutionMonitor(monitorRequestId, error)
    throw error
  }
}

function resolveUniswapTokenAddress(asset: ServerSwapAssetRef | undefined, networkId: string, label: string): string {
  if (!asset || asset.kind === 'native') return UNISWAP_NATIVE_ADDRESS
  const contractAddress = readString(asset.contractAddress)
  if (!ethers.isAddress(contractAddress)) {
    throw new Error(`${label} requires a valid token contract address`)
  }
  return contractAddress
}

function buildExplorerTxUrl(baseUrl: string | undefined, txid: string): string | undefined {
  const base = readString(baseUrl).replace(/\/+$/, '')
  const hash = readString(txid)
  if (!base || !hash) return undefined
  return `${base}/tx/${hash}`
}

function normalizeQuote(raw: unknown, request: ServerSwapQuoteRequest): ServerSwapQuote {
  if (isServerManagedQuoteResponse(raw)) {
    const response = asRecord(raw)
    const quoteId = readString(response.quoteId)
    if (!quoteId) throw new Error('Swap quote response is missing quoteId')
    return {
      quoteId,
      mode: (() => {
        const mode = readString(response.mode).toLowerCase()
        return mode === 'sponsored' || mode === 'intent' ? mode : 'standard'
      })(),
      sourceSymbol: readString(response.sourceSymbol) || request.source.symbol,
      destinationSymbol: readString(response.destinationSymbol) || request.destination.symbol,
      sourceAmount: readString(response.sourceAmount) || request.source.amount,
      destinationAmount: readString(response.destinationAmount),
      minDestinationAmount: readString(response.minDestinationAmount),
      expiresAt: readNumber(response.expiresAt) || Date.now() + 60_000,
      routeSummary: readString(response.routeSummary) || 'Server-mediated swap route',
      sponsorCoversNetworkFee: Boolean(response.sponsorCoversNetworkFee),
      estimatedNetworkFee: readString(response.estimatedNetworkFee) || undefined,
      estimatedNetworkFeeSymbol: readString(response.estimatedNetworkFeeSymbol) || undefined,
      estimatedServerFee: readString(response.estimatedServerFee) || undefined,
      priceImpactPct: readNumber(response.priceImpactPct) ?? null,
      warnings: readStringArray(response.warnings),
      metadata: {
        provider: 'server-execution',
        ...response
      }
    }
  }

  const response = asRecord(raw)
  const quote = asRecord(response.quote)
  const output = asRecord(quote.output)
  const routing = readString(response.routing).toUpperCase()
  const quoteId = readString(quote.quoteId || response.requestId)
  if (!quoteId) throw new Error('Swap quote response is missing quoteId')
  if (!['CLASSIC', 'WRAP', 'UNWRAP', 'BRIDGE'].includes(routing)) {
    throw new Error(`Uniswap routing "${routing || 'unknown'}" is not supported by this swap flow`)
  }

  const sourceDecimals = request.source.asset?.decimals ?? 18
  const destinationDecimals = request.destination.asset?.decimals ?? 18
  const destinationAmountRaw = readString(output.amount)
  const minDestinationAmountRaw = computeMinOutputRaw(destinationAmountRaw, request.slippageBps)
  const portionAmountRaw = readString(quote.portionAmount)
  const warnings = readStringArray(quote.txFailureReasons)
  const expiresAt = (() => {
    const fillDeadline = readNumber(quote.fillDeadline)
    if (fillDeadline) return fillDeadline * 1000
    const exclusivityDeadline = readNumber(quote.exclusivityDeadline)
    if (exclusivityDeadline) return exclusivityDeadline * 1000
    return Date.now() + 60_000
  })()

  return {
    quoteId,
    mode: 'standard',
    sourceSymbol: request.source.symbol,
    destinationSymbol: request.destination.symbol,
    sourceAmount: request.source.amount,
    destinationAmount: formatRawTokenAmount(destinationAmountRaw, destinationDecimals),
    minDestinationAmount: formatRawTokenAmount(minDestinationAmountRaw, destinationDecimals),
    expiresAt,
    routeSummary: readString(quote.routeString) || `${routing} via Uniswap`,
    sponsorCoversNetworkFee: false,
    estimatedNetworkFee: readString(quote.gasFee)
      ? formatRawTokenAmount(readString(quote.gasFee), sourceDecimals)
      : undefined,
    estimatedNetworkFeeSymbol: request.source.symbol,
    estimatedServerFee: portionAmountRaw
      ? `${formatRawTokenAmount(portionAmountRaw, destinationDecimals)} ${request.destination.symbol}`.trim()
      : undefined,
    priceImpactPct: readNumber(quote.priceImpact) ?? null,
    warnings,
    metadata: {
      provider: 'uniswap',
      routing,
      requestId: readString(response.requestId),
      quote,
      permitData: response.permitData ?? null,
      permitTransaction: response.permitTransaction ?? null,
      sourceChainId: request.source.chainId,
      destinationChainId: request.destination.chainId
    }
  }
}

function hasTransactionRequest(value: unknown): boolean {
  const tx = asRecord(value)
  return Boolean(readString(tx.to) && readString(tx.data))
}

function normalizeSettledAssetKind(value: unknown, fallback: ServerSwapAssetRef['kind']): ServerSwapAssetRef['kind'] {
  const normalized = readString(value).toLowerCase()
  if (normalized === 'native') return 'native'
  if (normalized === 'wrapped') return 'wrapped'
  if (normalized === 'fungible' || normalized === 'asset' || normalized === 'token' || normalized === 'erc20') return 'fungible'
  if (normalized === 'nft' || normalized === 'erc721' || normalized === 'erc1155') return 'nft'
  return fallback
}

function buildCanonicalAssetRef(
  side: 'source' | 'destination',
  requestAsset: ServerSwapAssetRef | undefined,
  metadata: Record<string, unknown>
): ServerSwapAssetRef | undefined {
  const assetId = readString(metadata[`${side}AssetId`]) || readString(requestAsset?.assetId)
  if (!assetId && !requestAsset) return undefined
  const kind = normalizeSettledAssetKind(metadata[`${side}AssetKind`], requestAsset?.kind || 'fungible')
  const contractAddress = readString(metadata[`${side}ContractAddress`]) || readString(requestAsset?.contractAddress) || undefined
  const decimals = readNumber((metadata as any)[`${side}Decimals`]) ?? requestAsset?.decimals
  return {
    assetId: assetId || readString(requestAsset?.assetId) || `${side}:asset`,
    kind,
    symbol: readString(metadata[`${side}Symbol`]) || requestAsset?.symbol,
    label: requestAsset?.label,
    contractAddress,
    decimals
  }
}

function buildServerManagedQuoteRequestBody(request: ServerSwapQuoteRequest): Record<string, unknown> {
  return {
    source: {
      networkId: request.source.networkId,
      symbol: request.source.symbol,
      address: request.source.address,
      amount: request.source.amount,
      asset: request.source.asset
        ? {
            assetId: request.source.asset.assetId,
            kind: request.source.asset.kind,
            contractAddress: request.source.asset.contractAddress,
            decimals: request.source.asset.decimals
          }
        : undefined
    },
    destination: {
      networkId: request.destination.networkId,
      symbol: request.destination.symbol,
      address: request.destination.address,
      asset: request.destination.asset
        ? {
            assetId: request.destination.asset.assetId,
            kind: request.destination.asset.kind,
            contractAddress: request.destination.asset.contractAddress,
            decimals: request.destination.asset.decimals
          }
        : undefined
    },
    slippageBps: request.slippageBps,
    sponsorPreference: request.sponsorPreference
  }
}

function buildApprovalMessage(
  request: ServerSwapSubmitRequest,
  metadata: Record<string, unknown>,
  sourceAsset: ServerSwapAssetRef | undefined,
  destinationAsset: ServerSwapAssetRef | undefined,
  nonce: string
): string {
  const expiresAt = readString(metadata.expiresAt)
  const sourceNetworkId = readString(metadata.sourceNetworkId) || request.source.networkId
  const sourceSymbol = readString(metadata.sourceSymbol) || request.source.symbol
  const destinationNetworkId = readString(metadata.destinationNetworkId) || request.destination.networkId
  const destinationSymbol = readString(metadata.destinationSymbol) || request.destination.symbol
  return [
    'MetaYoshi server execution approval',
    'version=1',
    'action=swap',
    `quoteId=${request.quoteId}`,
    `executionMode=${request.executionMode}`,
    `sourceNetworkId=${sourceNetworkId}`,
    `sourceSymbol=${sourceSymbol}`,
    `sourceAssetId=${readString(sourceAsset?.assetId)}`,
    `sourceAssetKind=${readString(sourceAsset?.kind)}`,
    `sourceContractAddress=${readString(sourceAsset?.contractAddress)}`,
    `sourceAddress=${request.source.address}`,
    `sourceAmount=${request.source.amount}`,
    `destinationNetworkId=${destinationNetworkId}`,
    `destinationSymbol=${destinationSymbol}`,
    `destinationAssetId=${readString(destinationAsset?.assetId)}`,
    `destinationAssetKind=${readString(destinationAsset?.kind)}`,
    `destinationContractAddress=${readString(destinationAsset?.contractAddress)}`,
    `destinationAddress=${request.destination.address}`,
    `minDestinationAmount=${request.minDestinationAmount}`,
    `sponsorPreference=${request.sponsorPreference}`,
    `expiresAt=${expiresAt}`,
    `nonce=${nonce}`
  ].join('\n')
}

async function submitServerManagedSwap(
  config: ServerExecutionRpcConfig,
  request: ServerSwapSubmitRequest
): Promise<ServerExecutionStatus> {
  const metadata = asRecord(request.quoteMetadata)
  if (!request.quoteId || Object.keys(metadata).length === 0) {
    throw new Error('Swap quote metadata is missing the server execution payload')
  }
  const signer = config.secureBridgeSigner
  if (typeof signer !== 'function') {
    throw new Error('Secure bridge signer is unavailable. Unlock wallet and retry.')
  }

  const sourceAsset = buildCanonicalAssetRef('source', request.source.asset, metadata)
  const destinationAsset = buildCanonicalAssetRef('destination', request.destination.asset, metadata)
  const sourceNetworkId = readString(metadata.sourceNetworkId) || request.source.networkId
  const sourceSymbol = readString(metadata.sourceSymbol) || request.source.symbol
  const destinationNetworkId = readString(metadata.destinationNetworkId) || request.destination.networkId
  const destinationSymbol = readString(metadata.destinationSymbol) || request.destination.symbol
  const approvalNonce = crypto.randomUUID()
  const approvalMessage = buildApprovalMessage(request, metadata, sourceAsset, destinationAsset, approvalNonce)
  const signature = await signer(approvalMessage)
  const approvalAddress = readString(signature?.address)
  const approvalSignature = readString(signature?.signature)
  if (!approvalAddress || !approvalSignature) {
    throw new Error('Swap approval signing failed')
  }

  const response = await executeServerManagedJsonRequest(config, '/v1/swap/submit', {
    method: 'POST',
    body: JSON.stringify({
      quoteId: request.quoteId,
      source: {
        networkId: sourceNetworkId,
        symbol: sourceSymbol,
        address: request.source.address,
        amount: request.source.amount,
        asset: sourceAsset
          ? {
              assetId: sourceAsset.assetId,
              kind: sourceAsset.kind,
              contractAddress: sourceAsset.contractAddress
            }
          : undefined
      },
      destination: {
        networkId: destinationNetworkId,
        symbol: destinationSymbol,
        address: request.destination.address,
        asset: destinationAsset
          ? {
              assetId: destinationAsset.assetId,
              kind: destinationAsset.kind,
              contractAddress: destinationAsset.contractAddress
            }
          : undefined
      },
      minDestinationAmount: request.minDestinationAmount,
      sponsorPreference: request.sponsorPreference,
      executionMode: request.executionMode,
      approval: {
        nonce: approvalNonce,
        address: approvalAddress,
        message: approvalMessage,
        signature: approvalSignature,
        signedAt: Date.now()
      }
    })
  }, 'submit')

  const steps = Array.isArray((response as any)?.steps) ? (response as any).steps : []
  const hasPreparedSteps = steps.some((step: unknown) => hasTransactionRequest(asRecord(asRecord(step).tx)))
  if (hasPreparedSteps) {
    let finalTxid = ''
    for (const step of steps) {
      const stepRecord = asRecord(step)
      const tx = asRecord(stepRecord.tx)
      if (!hasTransactionRequest(tx)) continue
      finalTxid = await broadcastTransaction(
        config,
        tx,
        readString(stepRecord.label) || readString(stepRecord.kind) || 'Swap step',
        Boolean(stepRecord.waitForConfirmation)
      )
    }

    if (!finalTxid) {
      throw new Error('Server swap submit returned prepared steps but no broadcastable transaction')
    }

    return {
      executionId: finalTxid,
      quoteId: readString(response.quoteId) || request.quoteId,
      status: 'submitted',
      detail: readString(response.detail) || 'Swap submitted',
      updatedAt: readNumber(response.updatedAt) || Date.now(),
      receipt: {
        txid: finalTxid,
        explorerUrl: buildExplorerTxUrl(config.explorerUrl, finalTxid),
        networkId: readString(response.networkId) || sourceNetworkId
      },
      warnings: readStringArray(response.warnings)
    }
  }

  return {
    executionId: readString(response.executionId),
    quoteId: readString(response.quoteId) || request.quoteId,
    status: normalizeExecutionStatus(response.status === 'submitted' ? 'PENDING' : response.status) === 'pending'
      ? (readString(response.status).toLowerCase() === 'broadcasted' ? 'broadcasted' : 'submitted')
      : normalizeExecutionStatus(response.status),
      detail: readString(response.detail) || 'Server swap submitted',
      updatedAt: readNumber(response.updatedAt) || Date.now(),
      receipt: {
        txid: readString(response.txid) || undefined,
        explorerUrl: readString(response.explorerUrl) || undefined,
        networkId: readString(response.networkId) || destinationNetworkId || sourceNetworkId
      },
    warnings: readStringArray(response.warnings)
  }
}

async function waitForTransactionReceipt(
  config: ServerExecutionRpcConfig,
  txid: string,
  label: string
): Promise<void> {
  const normalizedTxid = readString(txid)
  if (!normalizedTxid) throw new Error(`${label} transaction hash is missing`)

  for (let attempt = 0; attempt < TX_RECEIPT_MAX_POLLS; attempt += 1) {
    const receipt = await callBridgeMethod(config, 'eth_getTransactionReceipt', [normalizedTxid]).catch(() => null)
    const body = asRecord(receipt)
    if (Object.keys(body).length > 0) {
      const status = readString(body.status).toLowerCase()
      if (status === '0x1' || status === '1') return
      if (status === '0x0' || status === '0') {
        throw new Error(`${label} transaction failed on-chain`)
      }
    }
    await new Promise((resolve) => window.setTimeout(resolve, TX_RECEIPT_POLL_MS))
  }

  throw new Error(`${label} transaction is still pending after waiting for confirmation`)
}

async function broadcastTransaction(
  config: ServerExecutionRpcConfig,
  tx: Record<string, unknown>,
  label: string,
  waitForConfirmation = false
): Promise<string> {
  if (typeof config.sendTransaction !== 'function') {
    throw new Error('Swap execution transport is not configured for EVM transaction broadcast')
  }

  const sent = await config.sendTransaction({
    to: readString(tx.to) || undefined,
    from: readString(tx.from) || undefined,
    data: readString(tx.data) || undefined,
    value: readString(tx.value) || undefined,
    gasLimit: readString(tx.gasLimit) || undefined,
    gasPrice: readString(tx.gasPrice) || undefined,
    maxFeePerGas: readString(tx.maxFeePerGas) || undefined,
    maxPriorityFeePerGas: readString(tx.maxPriorityFeePerGas) || undefined,
    chainId: readString(tx.chainId) || config.chainId
  })
  const txid = readString((sent as any)?.hash)
  if (!txid) throw new Error(`${label} transaction broadcast did not return a hash`)
  if (waitForConfirmation) {
    await waitForTransactionReceipt(config, txid, label)
  }
  return txid
}

export function createServerExecutionRpcConfig(
  network: BridgeNetworkInput,
  options?: {
    sendTransaction?: ServerExecutionRpcConfig['sendTransaction']
    secureBridgeAddressResolver?: ServerExecutionRpcConfig['secureBridgeAddressResolver']
    secureBridgeSigner?: ServerExecutionRpcConfig['secureBridgeSigner']
  }
): ServerExecutionRpcConfig {
  return {
    networkId: network.id,
    coinSymbol: network.symbol,
    rpcUrl: network.rpcUrl,
    bridgeUrl: network.bridgeUrl,
    bridgeUsername: network.bridgeUsername,
    bridgePassword: network.bridgePassword,
    chainId: network.chainId,
    explorerUrl: network.explorerUrl,
    sendTransaction: options?.sendTransaction,
    secureBridgeAddressResolver: options?.secureBridgeAddressResolver,
    secureBridgeSigner: options?.secureBridgeSigner,
    useLocalRpc: false
  }
}

export async function resolveServerSwapAssetDecimals(
  config: ServerExecutionRpcConfig,
  asset?: ServerSwapAssetRef
): Promise<number> {
  if (!asset || asset.kind === 'native') return 18
  const declared = readNumber(asset.decimals)
  if (declared !== undefined && Number.isInteger(declared) && declared >= 0 && declared <= 30) {
    return declared
  }

  const contractAddress = readString(asset.contractAddress)
  if (!ethers.isAddress(contractAddress)) return 18
  const raw = await callBridgeMethod(config, 'eth_call', [{
    to: contractAddress,
    data: ERC20_METADATA_IFACE.encodeFunctionData('decimals', [])
  }, 'latest'])
  const [value] = ERC20_METADATA_IFACE.decodeFunctionResult('decimals', String(raw || '0x'))
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 30 ? parsed : 18
}

export function isTerminalServerExecutionStatus(status: ServerExecutionStatusState): boolean {
  return status === 'confirmed' || status === 'failed' || status === 'expired' || status === 'rejected'
}

export async function requestServerSwapQuote(
  config: ServerExecutionRpcConfig,
  request: ServerSwapQuoteRequest
): Promise<ServerSwapQuote> {
  let raw: unknown
  try {
    raw = await executeServerManagedJsonRequest(config, '/v1/swap/quote', {
      method: 'POST',
      body: JSON.stringify(buildServerManagedQuoteRequestBody(request))
    }, 'quote')
  } catch (error) {
    if (isLegacySwapFallbackError(error)) {
      throw new Error('MetaYoshi server swap service is unavailable')
    }
    throw error
  }
  const quote = normalizeQuote(raw, request)
  if (readString(asRecord(quote.metadata).provider) !== 'server-execution') {
    throw new Error('Swap quote response did not come from the MetaYoshi server swap service')
  }
  return quote
}

export async function submitServerSwap(
  config: ServerExecutionRpcConfig,
  request: ServerSwapSubmitRequest
): Promise<ServerExecutionStatus> {
  const metadata = asRecord(request.quoteMetadata)
  if (readString(metadata.provider) !== 'server-execution') {
    throw new Error('This wallet build only supports MetaYoshi server-managed swaps')
  }
  try {
    return await submitServerManagedSwap(config, request)
  } catch (error) {
    if (isLegacySwapFallbackError(error)) {
      throw new Error('MetaYoshi server swap service is unavailable')
    }
    throw error
  }
}

export async function fetchServerExecutionStatus(
  config: ServerExecutionRpcConfig,
  executionId: string
): Promise<ServerExecutionStatus> {
  const normalizedExecutionId = readString(executionId)
  if (!normalizedExecutionId) throw new Error('Execution id is required')
  if (isLikelyTransactionHash(normalizedExecutionId)) {
    const receipt = await callBridgeMethod(config, 'eth_getTransactionReceipt', [normalizedExecutionId]).catch(() => null)
    const body = asRecord(receipt)
    const status = readString(body.status).toLowerCase()
    if (!Object.keys(body).length) {
      return {
        executionId: normalizedExecutionId,
        status: 'pending',
        detail: 'Swap transaction pending',
        updatedAt: Date.now(),
        receipt: {
          txid: normalizedExecutionId,
          explorerUrl: buildExplorerTxUrl(config.explorerUrl, normalizedExecutionId),
          networkId: config.networkId
        },
        warnings: []
      }
    }

    return {
      executionId: normalizedExecutionId,
      status: status === '0x1' || status === '1' ? 'confirmed' : 'failed',
      detail: status === '0x1' || status === '1' ? 'Swap transaction confirmed' : 'Swap transaction failed',
      updatedAt: Date.now(),
      receipt: {
        txid: normalizedExecutionId,
        explorerUrl: buildExplorerTxUrl(config.explorerUrl, normalizedExecutionId),
        networkId: config.networkId
      },
      warnings: []
    }
  }
  let raw: unknown
  try {
    raw = await executeServerManagedJsonRequest(
      config,
      `/v1/execute/${encodeURIComponent(normalizedExecutionId)}`,
      { method: 'GET' },
      'status'
    )
  } catch (error) {
    if (isLegacySwapFallbackError(error)) {
      throw new Error('MetaYoshi server swap service is unavailable')
    }
    throw error
  }
  const response = asRecord(raw)
  return {
    executionId: readString(response.executionId) || normalizedExecutionId,
    quoteId: readString(response.quoteId) || undefined,
    status: (() => {
      const normalized = readString(response.status).toLowerCase()
      if (normalized === 'quoted') return 'quoted'
      if (normalized === 'submitted') return 'submitted'
      if (normalized === 'broadcasted') return 'broadcasted'
      if (normalized === 'pending') return 'pending'
      if (normalized === 'confirmed') return 'confirmed'
      if (normalized === 'failed') return 'failed'
      if (normalized === 'expired') return 'expired'
      if (normalized === 'rejected') return 'rejected'
      return 'pending'
    })(),
    detail: readString(response.detail) || undefined,
    updatedAt: readNumber(response.updatedAt) || Date.now(),
    receipt: {
      txid: readString(response.txid) || undefined,
      explorerUrl: readString(response.explorerUrl) || undefined,
      networkId: readString(response.networkId) || config.networkId
    },
    warnings: readStringArray(response.warnings)
  }
}
