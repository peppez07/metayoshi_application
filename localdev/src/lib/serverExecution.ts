import { ethers } from 'ethers'
import type { Network } from '../coins'
import type { UtxoRpcConfig } from './utxoRpc'
import { callBridgeMethod } from './utxoRpc'
import { useApiMonitorStore } from '../store/apiMonitorStore'

const APP_API_KEY = String((import.meta as any)?.env?.VITE_APP_API_KEY || '').trim()
const DEFAULT_UNISWAP_API_BASE = 'https://trade-api.gateway.uniswap.org/v1'
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
  kind: 'native' | 'fungible' | 'nft'
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

function getUniswapApiBase(): string {
  const explicit = readString((import.meta as any)?.env?.VITE_UNISWAP_API_BASE_URL).replace(/\/+$/, '')
  if (explicit) return explicit
  const legacy = readString((import.meta as any)?.env?.VITE_SECURE_BRIDGE_API_BASE_URL).replace(/\/+$/, '')
  if (legacy) return legacy
  return DEFAULT_UNISWAP_API_BASE
}

function getServerExecutionMonitorMethod(action: ServerExecutionAction): string {
  switch (action) {
    case 'quote':
      return 'uniswap.quote'
    case 'approval':
      return 'uniswap.check_approval'
    case 'submit':
      return 'uniswap.swap'
    case 'status':
      return 'uniswap.swaps'
    default:
      return 'uniswap'
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

  const url = `${getUniswapApiBase()}${path}`
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
  const response = asRecord(raw)
  const quote = asRecord(response.quote)
  const input = asRecord(quote.input)
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
  const sourceChainId = Number(request.source.chainId || config.chainId || 0)
  const destinationChainId = Number(request.destination.chainId || 0)
  if (!sourceChainId || !destinationChainId) {
    throw new Error('EVM chainId is required for Uniswap swap quoting')
  }

  const sourceDecimals = request.source.asset?.decimals ?? 18
  const sourceAmountRaw = uiAmountToRaw(request.source.amount, sourceDecimals)
  const body: Record<string, unknown> = {
    type: 'EXACT_INPUT',
    amount: sourceAmountRaw,
    tokenInChainId: sourceChainId,
    tokenOutChainId: destinationChainId,
    tokenIn: resolveUniswapTokenAddress(request.source.asset, request.source.networkId, 'Source asset'),
    tokenOut: resolveUniswapTokenAddress(request.destination.asset, request.destination.networkId, 'Destination asset'),
    swapper: request.source.address,
    slippageTolerance: Number((Math.max(1, request.slippageBps) / 100).toFixed(2)),
    routingPreference: 'BEST_PRICE'
  }

  if (sourceChainId === destinationChainId) {
    body.protocols = ['V2', 'V3', 'V4']
  }

  const raw = await executeUniswapJsonRequest(config, '/quote', {
    method: 'POST',
    body: JSON.stringify(body)
  }, 'quote')
  return normalizeQuote(raw, request)
}

export async function submitServerSwap(
  config: ServerExecutionRpcConfig,
  request: ServerSwapSubmitRequest
): Promise<ServerExecutionStatus> {
  const sourceChainId = Number(request.source.chainId || config.chainId || 0)
  const destinationChainId = Number(request.destination.chainId || 0)
  if (!sourceChainId || !destinationChainId) {
    throw new Error('EVM chainId is required for Uniswap swap execution')
  }

  const metadata = asRecord(request.quoteMetadata)
  const rawQuote = asRecord(metadata.quote)
  if (Object.keys(rawQuote).length === 0) {
    throw new Error('Swap quote metadata is missing the Uniswap quote payload')
  }

  const sourceAmountRaw = readString(asRecord(rawQuote.input).amount)
    || uiAmountToRaw(request.source.amount, request.source.asset?.decimals ?? 18)
  const tokenIn = resolveUniswapTokenAddress(request.source.asset, request.source.networkId, 'Source asset')
  const tokenOut = resolveUniswapTokenAddress(request.destination.asset, request.destination.networkId, 'Destination asset')

  if (tokenIn !== UNISWAP_NATIVE_ADDRESS) {
    const approvalResponse = await executeUniswapJsonRequest(config, '/check_approval', {
      method: 'POST',
      body: JSON.stringify({
        walletAddress: request.source.address,
        token: tokenIn,
        amount: sourceAmountRaw,
        chainId: sourceChainId,
        tokenOut,
        tokenOutChainId: destinationChainId,
        includeGasInfo: true,
        urgency: 'normal'
      })
    }, 'approval')
    const cancelTx = asRecord(approvalResponse?.cancel)
    const approvalTx = asRecord(approvalResponse?.approval)

    if (hasTransactionRequest(cancelTx)) {
      await broadcastTransaction(config, cancelTx, 'Approval reset', true)
    }
    if (hasTransactionRequest(approvalTx)) {
      await broadcastTransaction(config, approvalTx, 'Approval', true)
    }
  }

  const swapResponse = await executeUniswapJsonRequest(config, '/swap', {
    method: 'POST',
    body: JSON.stringify({
      quote: rawQuote,
      refreshGasPrice: true,
      simulateTransaction: false,
      urgency: 'normal'
    })
  }, 'submit')
  const swapTx = asRecord(swapResponse?.swap)
  if (!hasTransactionRequest(swapTx)) {
    throw new Error('Swap execution response is missing a transaction payload')
  }

  const txid = await broadcastTransaction(config, swapTx, 'Swap', false)
  return {
    executionId: txid,
    quoteId: request.quoteId,
    status: 'submitted',
    detail: 'Uniswap swap submitted',
    updatedAt: Date.now(),
    receipt: {
      txid,
      explorerUrl: buildExplorerTxUrl(config.explorerUrl, txid),
      networkId: request.source.networkId
    },
    warnings: []
  }
}

export async function fetchServerExecutionStatus(
  config: ServerExecutionRpcConfig,
  executionId: string
): Promise<ServerExecutionStatus> {
  const txid = encodeURIComponent(readString(executionId))
  if (!txid) throw new Error('Execution id is required')
  const chainId = Number(config.chainId || 0)
  if (!chainId) throw new Error('Source chainId is required to fetch Uniswap swap status')

  const raw = await executeUniswapJsonRequest(
    config,
    `/swaps?txHashes=${txid}&chainId=${encodeURIComponent(String(chainId))}`,
    { method: 'GET' },
    'status'
  )
  const row = Array.isArray(raw?.swaps) ? asRecord(raw.swaps[0]) : {}
  const resolvedTxid = readString(row.txHash || executionId)
  const status = normalizeExecutionStatus(row.status)
  const swapType = readString(row.swapType)
  return {
    executionId: resolvedTxid || readString(executionId),
    status,
    detail: status === 'confirmed'
      ? `Uniswap ${swapType || 'swap'} confirmed`
      : status === 'failed'
        ? `Uniswap ${swapType || 'swap'} failed`
        : status === 'expired'
          ? `Uniswap ${swapType || 'swap'} expired`
          : `Uniswap ${swapType || 'swap'} pending`,
    updatedAt: Date.now(),
    receipt: {
      txid: resolvedTxid || undefined,
      explorerUrl: buildExplorerTxUrl(config.explorerUrl, resolvedTxid),
      networkId: config.networkId
    },
    warnings: []
  }
}
