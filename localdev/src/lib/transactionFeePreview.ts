import { ethers } from 'ethers'
import type { Network } from '../coins'
import type { EvmGasLane, UtxoFeePreset, UtxoInputStrategy } from './coinFeatureModel'
import { estimateNetworkFeeUi } from './estimateNetworkFeeUi'
import { estimateEvmTxFee, type EvmFeeQuote } from './evmFee'
import {
  callBridgeMethod,
  getAddressUtxos,
  listUtxoUnspent,
  type UtxoRpcConfig,
  type UtxoUnspent
} from './utxoRpc'
import { resolveRuntimeModelId } from './runtimeModel'

export type TransactionFeePreviewSource = 'live' | 'fallback'

export interface TransactionFeePreviewResult {
  fee: number
  source: TransactionFeePreviewSource
  debugLabel: string
  debugDetails?: string
}

type PreviewNetwork = Pick<
  Network,
  | 'id'
  | 'symbol'
  | 'coinSymbol'
  | 'rpcUrl'
  | 'rpcWallet'
  | 'rpcUsername'
  | 'rpcPassword'
  | 'bridgeUrl'
  | 'bridgeUsername'
  | 'bridgePassword'
  | 'coinType'
  | 'feePerByte'
  | 'runtimeModelId'
>

export interface EstimateTransactionFeePreviewInput {
  network: PreviewNetwork
  fromAddress?: string
  toAddress?: string
  amount?: string
  assetId?: string
  assetLogos?: Record<string, string>
  isAssetTransfer?: boolean
  dataHex?: string
  gasLimit?: string
  gasPrice?: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
  type?: 2
  gasLane?: EvmGasLane
  utxoFeePreset?: UtxoFeePreset
  utxoInputStrategy?: UtxoInputStrategy
}

const EVM_ERC20_IFACE = new ethers.Interface([
  'function transfer(address to, uint256 value) returns (bool)',
  'function decimals() view returns (uint8)'
])
const EVM_ERC721_IFACE = new ethers.Interface([
  'function safeTransferFrom(address from, address to, uint256 tokenId)'
])
const EVM_ERC1155_IFACE = new ethers.Interface([
  'function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)'
])
const PREVIEW_RPC_TIMEOUT_MS = 4_000
const UTXO_FEE_RATE_CACHE_TTL_MS = 15_000
const utxoFeeRateCache = new Map<string, { checkedAt: number; feePerByteSats: number }>()

interface UtxoFeeRateResolution {
  feePerByteSats: number
  source: 'cache' | 'estimatesmartfee' | 'getmempoolinfo' | 'getnetworkinfo' | 'configured-fee'
}

interface UtxoFeePreviewResult {
  fee: number
  debugLabel: string
  debugDetails: string
}

function buildRpcPreviewConfig(network: PreviewNetwork): UtxoRpcConfig {
  return {
    networkId: network.id,
    coinSymbol: network.coinSymbol || network.symbol,
    rpcUrl: network.rpcUrl,
    rpcWallet: network.rpcWallet,
    rpcUsername: network.rpcUsername,
    rpcPassword: network.rpcPassword,
    bridgeUrl: network.bridgeUrl,
    bridgeUsername: network.bridgeUsername,
    bridgePassword: network.bridgePassword,
    timeoutMs: PREVIEW_RPC_TIMEOUT_MS,
    useLocalRpc: false
  }
}

function parseOptionalRpcQuantity(value: string | undefined, label: string): bigint | undefined {
  const text = String(value || '').trim()
  if (!text) return undefined
  if (/^\d+$/.test(text)) return BigInt(text)
  if (/^0x[0-9a-f]+$/i.test(text)) return BigInt(text)
  throw new Error(`${label} must be a decimal integer or 0x-prefixed hex quantity`)
}

function parseEvmNftAssetKey(assetId: string): { standard: 'erc721' | 'erc1155'; address: string; tokenId: string } | null {
  const m = String(assetId || '').trim().match(/^EVMNFT:(erc721|erc1155):(0x[a-fA-F0-9]{40}):(.+)$/)
  if (!m) return null
  return {
    standard: m[1] as 'erc721' | 'erc1155',
    address: ethers.getAddress(m[2]),
    tokenId: m[3]
  }
}

function extractEvmTokenAddressFromLogoUri(logoUri: string): string {
  const raw = String(logoUri || '').trim()
  if (!raw) return ''
  const m = raw.match(/\/assets\/(0x[a-fA-F0-9]{40})\/logo\.(?:png|svg|webp|jpg|jpeg)$/i)
  if (!m) return ''
  return ethers.isAddress(m[1]) ? ethers.getAddress(m[1]) : ''
}

function supportsAddressIndex(coinSymbol?: string): boolean {
  const symbol = String(coinSymbol || '').trim().toUpperCase()
  return symbol === 'RTM' || symbol === 'BTCZ' || symbol === 'ZEC' || symbol === 'TIDE' || symbol === 'FIRO' || symbol === 'DOGE'
}

function parseFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function compactPreviewError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? 'Unknown error')
  const compact = message.replace(/\s+/g, ' ').trim()
  return compact.length > 160 ? `${compact.slice(0, 157)}...` : compact
}

function resolveCachedUtxoFeeRate(cacheKey: string): number | null {
  const cached = utxoFeeRateCache.get(cacheKey)
  if (!cached) return null
  if (cached.checkedAt + UTXO_FEE_RATE_CACHE_TTL_MS <= Date.now()) {
    utxoFeeRateCache.delete(cacheKey)
    return null
  }
  return cached.feePerByteSats
}

function writeCachedUtxoFeeRate(cacheKey: string, feePerByteSats: number): number {
  const normalized = Math.max(1, Math.round(Number(feePerByteSats) || 0))
  utxoFeeRateCache.set(cacheKey, {
    checkedAt: Date.now(),
    feePerByteSats: normalized
  })
  return normalized
}

async function resolveUtxoFeeRateSats(rpcConfig: UtxoRpcConfig, network: PreviewNetwork): Promise<UtxoFeeRateResolution> {
  const cacheKey = `${String(network.id || '').trim().toLowerCase()}::${String(rpcConfig.bridgeUrl || rpcConfig.rpcUrl || '').trim().toLowerCase()}`
  const cached = resolveCachedUtxoFeeRate(cacheKey)
  if (cached !== null) {
    return { feePerByteSats: cached, source: 'cache' }
  }

  try {
    const smartFee = await callBridgeMethod(rpcConfig, 'estimatesmartfee', [6])
    const feeRatePerKb = parseFiniteNumber(
      (smartFee as any)?.feerate
      ?? (smartFee as any)?.result?.feerate
      ?? (smartFee as any)?.result?.result?.feerate
    )
    if (feeRatePerKb && feeRatePerKb > 0) {
      return {
        feePerByteSats: writeCachedUtxoFeeRate(cacheKey, Math.max(1, Math.round((feeRatePerKb * 1e8) / 1000))),
        source: 'estimatesmartfee'
      }
    }
  } catch {
    // Some bridges/nodes do not expose estimatesmartfee.
  }

  for (const method of ['getmempoolinfo', 'getnetworkinfo']) {
    try {
      const raw = await callBridgeMethod(rpcConfig, method, [])
      const feeRatePerKb = parseFiniteNumber(
        (raw as any)?.mempoolminfee
        ?? (raw as any)?.minrelaytxfee
        ?? (raw as any)?.relayfee
        ?? (raw as any)?.paytxfee
        ?? (raw as any)?.result?.mempoolminfee
        ?? (raw as any)?.result?.minrelaytxfee
        ?? (raw as any)?.result?.relayfee
        ?? (raw as any)?.result?.paytxfee
        ?? (raw as any)?.result?.result?.mempoolminfee
        ?? (raw as any)?.result?.result?.minrelaytxfee
        ?? (raw as any)?.result?.result?.relayfee
        ?? (raw as any)?.result?.result?.paytxfee
      )
      if (feeRatePerKb && feeRatePerKb > 0) {
        return {
          feePerByteSats: writeCachedUtxoFeeRate(cacheKey, Math.max(1, Math.round((feeRatePerKb * 1e8) / 1000))),
          source: method as 'getmempoolinfo' | 'getnetworkinfo'
        }
      }
    } catch {
      // Keep falling back until one endpoint works.
    }
  }

  const rawFeePerByteCoins = Number(network.feePerByte ?? 0.0000002)
  return {
    feePerByteSats: writeCachedUtxoFeeRate(cacheKey, Math.max(1, Math.round(rawFeePerByteCoins * 1e8))),
    source: 'configured-fee'
  }
}

async function estimateUtxoNativeTransferFee(input: EstimateTransactionFeePreviewInput): Promise<UtxoFeePreviewResult> {
  const rpcConfig = buildRpcPreviewConfig(input.network)
  const senderAddress = String(input.fromAddress || '').trim()
  const toAddress = String(input.toAddress || '').trim()
  const amountText = String(input.amount || '').trim()
  const amountCoins = Number(amountText)
  const coinSymbol = String(input.network.coinSymbol || input.network.symbol || '').trim().toUpperCase()

  if (!senderAddress || !toAddress) throw new Error('Sender and recipient are required for UTXO fee estimation')
  if (!Number.isFinite(amountCoins) || amountCoins <= 0) throw new Error('Amount must be greater than 0')

  let unspent: UtxoUnspent[] = []
  if (supportsAddressIndex(coinSymbol)) {
    try {
      const byIndex = await getAddressUtxos(rpcConfig, senderAddress, 1)
      if (byIndex.length > 0) unspent = byIndex
    } catch {
      // Address index may be unavailable on some nodes.
    }
  }
  if (unspent.length === 0) {
    try {
      const byWallet = await listUtxoUnspent(rpcConfig, senderAddress, 1)
      if (byWallet.length > 0) unspent = byWallet
    } catch {
      // Watch-only wallet coverage may be unavailable.
    }
  }
  if (unspent.length === 0) {
    throw new Error(`No confirmed spendable UTXOs found for quick fee preview on address ${senderAddress}`)
  }

  if (unspent.length > 0) {
    const normalizedSender = senderAddress
    unspent = unspent.filter((utxo) => String(utxo.address || normalizedSender).trim() === normalizedSender)
  }
  if (unspent.length === 0) {
    throw new Error(`No confirmed spendable UTXOs remain for address ${senderAddress}`)
  }

  const sat = (coins: number): number => Math.round(Number(coins) * 1e8)
  const coins8 = (sats: number): number => Number((sats / 1e8).toFixed(8))
  const feeRateResolution = await resolveUtxoFeeRateSats(rpcConfig, input.network)
  let feePerByteSats = feeRateResolution.feePerByteSats
  if (feePerByteSats > 500) feePerByteSats = Math.max(1, Math.round(feePerByteSats / 1000))

  const feePreset = String(input.utxoFeePreset || 'fast').trim().toLowerCase()
  if (feePreset === 'cheap') feePerByteSats = Math.max(1, Math.floor((feePerByteSats * 80) / 100))
  if (feePreset === 'premium') feePerByteSats = Math.max(1, Math.ceil((feePerByteSats * 145) / 100))

  const inputStrategy = String(input.utxoInputStrategy || 'minimize-inputs').trim().toLowerCase()
  const sorted = [...unspent].sort((a, b) => (
    inputStrategy === 'consolidate-fragments'
      ? a.amount - b.amount
      : b.amount - a.amount
  ))

  const OVERHEAD_BYTES = 10
  const INPUT_BYTES = 148
  const OUTPUT_BYTES = 34
  const outputsWithoutChange = 1
  const selectedUtxos: UtxoUnspent[] = []
  let accumulatedSats = 0
  let amountToSendSats = sat(amountCoins)
  const totalAvailableSats = sorted.reduce((sum, utxo) => sum + sat(utxo.amount), 0)
  const isRtmSelfSend = resolveRuntimeModelId(input.network as Network) === 'rtm' && toAddress === senderAddress

  for (const utxo of sorted) {
    selectedUtxos.push(utxo)
    accumulatedSats += sat(utxo.amount)
    const txBytesTry = OVERHEAD_BYTES + INPUT_BYTES * selectedUtxos.length + OUTPUT_BYTES * (outputsWithoutChange + 1)
    const estimatedFeeTry = txBytesTry * feePerByteSats
    if (accumulatedSats >= amountToSendSats + estimatedFeeTry) break
    if (selectedUtxos.length >= 25) break
  }

  if (selectedUtxos.length === 0) {
    throw new Error('Unable to select spendable UTXOs for fee estimation')
  }

  const txBytes = OVERHEAD_BYTES + INPUT_BYTES * selectedUtxos.length + OUTPUT_BYTES * (outputsWithoutChange + 1)
  const estimatedFeeSats = txBytes * feePerByteSats

  if (isRtmSelfSend && amountToSendSats + estimatedFeeSats > totalAvailableSats) {
    amountToSendSats = Math.max(0, totalAvailableSats - estimatedFeeSats)
  }
  if (amountToSendSats <= 0) {
    throw new Error(`Amount is too low after network fee for ${coinSymbol || input.network.symbol}`)
  }

  return {
    fee: coins8(estimatedFeeSats),
    debugLabel: `UTXO live quote via ${feeRateResolution.source}`,
    debugDetails: `${input.network.symbol} | utxos=${selectedUtxos.length} | feeRate=${feePerByteSats} sat/B | preset=${feePreset} | strategy=${inputStrategy}`
  }
}

function estimateFeeFromResolvedEvmQuote(
  quote: EvmFeeQuote,
  input: Pick<
    EstimateTransactionFeePreviewInput,
    'gasLimit' | 'gasPrice' | 'maxFeePerGas' | 'maxPriorityFeePerGas' | 'type'
  >
): bigint {
  const manualGasLimit = parseOptionalRpcQuantity(input.gasLimit, 'gasLimit')
  const manualGasPrice = parseOptionalRpcQuantity(input.gasPrice, 'gasPrice')
  const manualMaxFeePerGas = parseOptionalRpcQuantity(input.maxFeePerGas, 'maxFeePerGas')
  const manualMaxPriorityFeePerGas = parseOptionalRpcQuantity(input.maxPriorityFeePerGas, 'maxPriorityFeePerGas')

  if (manualGasPrice !== undefined && (manualMaxFeePerGas !== undefined || manualMaxPriorityFeePerGas !== undefined)) {
    throw new Error('Use either gasPrice or EIP-1559 fee fields, not both')
  }

  const resolvedGasLimit = manualGasLimit ?? quote.gasLimit
  const resolvedType = manualGasPrice !== undefined
    ? undefined
    : ((input.type === 2 || manualMaxFeePerGas !== undefined || manualMaxPriorityFeePerGas !== undefined || quote.type === 2) ? 2 : undefined)

  if (resolvedType === 2) {
    const effectiveMaxFeePerGas = manualMaxFeePerGas ?? quote.maxFeePerGas
    const effectiveMaxPriorityFeePerGas = manualMaxPriorityFeePerGas ?? quote.maxPriorityFeePerGas
    if (effectiveMaxFeePerGas === undefined || effectiveMaxPriorityFeePerGas === undefined) {
      throw new Error('Missing EIP-1559 fee quote for type 2 transaction')
    }
    return resolvedGasLimit * effectiveMaxFeePerGas
  }

  const effectiveGasPrice = manualGasPrice ?? quote.gasPrice ?? 1_000_000_000n
  return resolvedGasLimit * effectiveGasPrice
}

async function estimateEvmAssetTransferFee(input: EstimateTransactionFeePreviewInput): Promise<bigint> {
  const rpcConfig = buildRpcPreviewConfig(input.network)
  const fromAddress = String(input.fromAddress || '').trim()
  const toAddress = String(input.toAddress || '').trim()
  const assetId = String(input.assetId || '').trim()
  const amount = String(input.amount || '').trim()
  const assetLogos = input.assetLogos || {}
  const nft = parseEvmNftAssetKey(assetId)

  if (nft) {
    const transferData = nft.standard === 'erc721'
      ? EVM_ERC721_IFACE.encodeFunctionData('safeTransferFrom', [fromAddress, toAddress, BigInt(nft.tokenId)])
      : EVM_ERC1155_IFACE.encodeFunctionData('safeTransferFrom', [
          fromAddress,
          toAddress,
          BigInt(nft.tokenId),
          BigInt(String(Math.max(1, Math.trunc(Number(amount) || 1)))),
          '0x'
        ])
    const quote = await estimateEvmTxFee({
      rpcConfig,
      from: fromAddress,
      to: nft.address,
      data: transferData,
      valueWei: 0n,
      fallbackGasLimitHex: '0x30d40',
      lane: input.gasLane
    })
    return estimateFeeFromResolvedEvmQuote(quote, input)
  }

  let tokenAddress = ethers.isAddress(assetId) ? ethers.getAddress(assetId) : ''
  if (!tokenAddress) {
    tokenAddress = extractEvmTokenAddressFromLogoUri(String(assetLogos[assetId] || ''))
  }
  if (!tokenAddress) {
    throw new Error('Unable to resolve token contract address for fee estimation')
  }

  let decimals = 18
  try {
    const data = EVM_ERC20_IFACE.encodeFunctionData('decimals', [])
    const raw = await callBridgeMethod(rpcConfig, 'eth_call', [{ to: tokenAddress, data }, 'latest'])
    const [value] = EVM_ERC20_IFACE.decodeFunctionResult('decimals', String(raw || '0x'))
    const nextDecimals = Number(value)
    if (Number.isFinite(nextDecimals) && nextDecimals >= 0 && nextDecimals <= 30) {
      decimals = Math.trunc(nextDecimals)
    }
  } catch {
    // Keep fallback decimals.
  }

  const amountRaw = ethers.parseUnits(String(amount || '0'), decimals)
  const transferData = EVM_ERC20_IFACE.encodeFunctionData('transfer', [toAddress, amountRaw])
  const quote = await estimateEvmTxFee({
    rpcConfig,
    from: fromAddress,
    to: tokenAddress,
    data: transferData,
    valueWei: 0n,
    fallbackGasLimitHex: '0x186a0',
    lane: input.gasLane
  })
  return estimateFeeFromResolvedEvmQuote(quote, input)
}

async function estimateEvmNativeTransferFee(input: EstimateTransactionFeePreviewInput): Promise<bigint> {
  const rpcConfig = buildRpcPreviewConfig(input.network)
  const amount = String(input.amount || '0').trim() || '0'
  const valueWei = ethers.parseEther(amount)
  const quote = await estimateEvmTxFee({
    rpcConfig,
    from: String(input.fromAddress || '').trim(),
    to: String(input.toAddress || '').trim() || undefined,
    valueWei,
    data: String(input.dataHex || '').trim() || undefined,
    fallbackGasLimitHex: String(input.dataHex || '').trim() ? '0x30d40' : '0x5208',
    lane: input.gasLane
  })
  return estimateFeeFromResolvedEvmQuote(quote, input)
}

export async function estimateTransactionFeePreview(
  input: EstimateTransactionFeePreviewInput
): Promise<TransactionFeePreviewResult> {
  const fallback = estimateNetworkFeeUi(input.network as Network)
  const fromAddress = String(input.fromAddress || '').trim()
  const toAddress = String(input.toAddress || '').trim()

  if (!fromAddress) {
    return {
      fee: fallback,
      source: 'fallback',
      debugLabel: 'Fallback estimate',
      debugDetails: 'Missing sender address for fee preview.'
    }
  }

  try {
    if (input.network.coinType === 'EVM' && (toAddress || String(input.dataHex || '').trim())) {
      const estimatedFeeWei = input.isAssetTransfer
        ? await estimateEvmAssetTransferFee(input)
        : await estimateEvmNativeTransferFee(input)
      return {
        fee: Number(ethers.formatEther(estimatedFeeWei)),
        source: 'live',
        debugLabel: input.isAssetTransfer ? 'EVM live asset quote' : 'EVM live native quote',
        debugDetails: `${input.network.symbol} | lane=${String(input.gasLane || 'balanced')}`
      }
    }

    if (input.network.coinType === 'UTXO' && !input.isAssetTransfer && toAddress) {
      const preview = await estimateUtxoNativeTransferFee(input)
      return { fee: preview.fee, source: 'live', debugLabel: preview.debugLabel, debugDetails: preview.debugDetails }
    }

    return {
      fee: fallback,
      source: 'fallback',
      debugLabel: 'Fallback estimate',
      debugDetails: `No live preview path for ${input.network.coinType}${input.isAssetTransfer ? ' asset send' : ' native send'}.`
    }
  } catch (error) {
    return {
      fee: fallback,
      source: 'fallback',
      debugLabel: 'Fallback estimate',
      debugDetails: compactPreviewError(error)
    }
  }
}
