import { ethers } from 'ethers'
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction
} from '@solana/web3.js'
import { TronWeb } from 'tronweb'
import type { Network } from '../coins'
import type { EvmGasLane, UtxoFeePreset, UtxoInputStrategy } from './coinFeatureModel'
import { estimateNetworkFeeUi } from './estimateNetworkFeeUi'
import { extractSolanaMintFromAssetId } from './assetTypes'
import { extractEvmTokenAddressFromAssetId, extractEvmTokenAddressFromLogoUri } from './evmAssetId'
import { estimateEvmTxFee, type EvmFeeQuote } from './evmFee'
import { parseTrc20UiAmountToRaw, readTrc20TokenMetadata } from './tronNonCustodial'
import { extractTronContractFromAssetId, extractTronContractFromLogoUri } from './tronAssetId'
import {
  callBridgeMethod,
  fetchBridgeAddressAssetUtxos,
  getAddressUtxos,
  listUnspentAssets,
  listUtxoUnspent,
  type UtxoRpcConfig,
  type UtxoUnspent
} from './utxoRpc'
import { resolveRuntimeModelId } from './runtimeModel'

export type TransactionFeePreviewSource = 'live' | 'fallback'
export type TransactionFeePreviewKind = 'estimate' | 'max-cap'

export interface TransactionFeePreviewResult {
  fee: number
  source: TransactionFeePreviewSource
  kind: TransactionFeePreviewKind
  isFinal: false
  statusLabel: string
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
const SOL_TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
const SOL_TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')
const SOL_ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1Q2hvZbsiqW5xWH25efTNsLJA8knL')

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

function supportsAddressIndex(coinSymbol?: string): boolean {
  const symbol = String(coinSymbol || '').trim().toUpperCase()
  return symbol === 'RTM' || symbol === 'BTCZ' || symbol === 'ZEC' || symbol === 'TIDE' || symbol === 'FIRO' || symbol === 'DOGE' || symbol === 'DASH'
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

function parseSolAmountToLamports(amount: string): bigint {
  const raw = String(amount || '').trim()
  if (!/^\d+(\.\d+)?$/.test(raw)) throw new Error('Invalid SOL amount')
  const [whole, frac = ''] = raw.split('.')
  if (frac.length > 9) throw new Error('SOL supports up to 9 decimals')
  const lamports = BigInt(`${whole}${frac.padEnd(9, '0')}`.replace(/^0+/, '') || '0')
  if (lamports <= 0n) throw new Error('Amount must be greater than 0')
  return lamports
}

function parseSplAmountToRaw(amount: string, decimals: number): bigint {
  const raw = String(amount || '').trim()
  if (!/^\d+(\.\d+)?$/.test(raw)) throw new Error('Invalid SPL token amount')
  const [whole, frac = ''] = raw.split('.')
  if (frac.length > decimals) throw new Error(`Token supports up to ${decimals} decimals`)
  const out = BigInt(`${whole}${frac.padEnd(decimals, '0')}`.replace(/^0+/, '') || '0')
  if (out <= 0n) throw new Error('Token amount must be greater than 0')
  return out
}

function resolveSolanaRpcCandidates(rpcUrl: string): string[] {
  const primary = String(rpcUrl || '').trim()
  return Array.from(new Set([primary].filter(Boolean)))
}

async function withSolanaPreviewConnection<T>(rpcUrl: string, task: (connection: Connection) => Promise<T>): Promise<T> {
  let lastError: unknown = null
  for (const candidate of resolveSolanaRpcCandidates(rpcUrl)) {
    try {
      const connection = new Connection(candidate, 'confirmed')
      return await task(connection)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Solana RPC request failed')
}

function getSolanaAssociatedTokenAddress(owner: PublicKey, mint: PublicKey, tokenProgram: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), tokenProgram.toBuffer(), mint.toBuffer()],
    SOL_ASSOCIATED_TOKEN_PROGRAM_ID
  )[0]
}

function createSolanaAssociatedTokenAccountInstruction(
  payer: PublicKey,
  ata: PublicKey,
  owner: PublicKey,
  mint: PublicKey,
  tokenProgram: PublicKey
): TransactionInstruction {
  return new TransactionInstruction({
    programId: SOL_ASSOCIATED_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: ata, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }
    ],
    data: Buffer.alloc(0)
  })
}

function toU64LE(value: bigint): Buffer {
  const out = Buffer.alloc(8)
  let v = value
  for (let i = 0; i < 8; i += 1) {
    out[i] = Number(v & 0xffn)
    v >>= 8n
  }
  return out
}

function createSolanaTransferCheckedInstruction(
  sourceAta: PublicKey,
  mint: PublicKey,
  destinationAta: PublicKey,
  owner: PublicKey,
  amountRaw: bigint,
  decimals: number,
  tokenProgram: PublicKey
): TransactionInstruction {
  const data = Buffer.concat([
    Buffer.from([12]),
    toU64LE(amountRaw),
    Buffer.from([decimals & 0xff])
  ])
  return new TransactionInstruction({
    programId: tokenProgram,
    keys: [
      { pubkey: sourceAta, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: destinationAta, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false }
    ],
    data
  })
}

async function resolveSolanaMintMetadata(connection: Connection, mint: PublicKey): Promise<{ decimals: number; tokenProgram: PublicKey }> {
  const info = await connection.getParsedAccountInfo(mint, 'confirmed')
  const owner = info.value?.owner
  const tokenProgram = owner?.equals(SOL_TOKEN_2022_PROGRAM_ID) ? SOL_TOKEN_2022_PROGRAM_ID : SOL_TOKEN_PROGRAM_ID
  const parsed = (info.value?.data as any)?.parsed
  const decimals = Number(parsed?.info?.decimals ?? 0)
  if (!Number.isFinite(decimals) || decimals < 0 || decimals > 18) {
    throw new Error('Invalid mint decimals')
  }
  return { decimals: Math.trunc(decimals), tokenProgram }
}

async function estimateSolanaNativeTransferFee(input: EstimateTransactionFeePreviewInput): Promise<UtxoFeePreviewResult> {
  const rpcUrl = String(input.network.rpcUrl || '').trim()
  const fromAddress = String(input.fromAddress || '').trim()
  const toAddress = String(input.toAddress || '').trim()
  if (!rpcUrl) throw new Error('Missing Solana RPC URL')
  const from = new PublicKey(fromAddress)
  const to = new PublicKey(toAddress)
  const lamports = parseSolAmountToLamports(String(input.amount || '').trim())

  return await withSolanaPreviewConnection(rpcUrl, async (connection) => {
    const tx = new Transaction().add(SystemProgram.transfer({
      fromPubkey: from,
      toPubkey: to,
      lamports: Number(lamports)
    }))
    const { blockhash } = await connection.getLatestBlockhash('confirmed')
    tx.feePayer = from
    tx.recentBlockhash = blockhash
    const feeLamports = (await connection.getFeeForMessage(tx.compileMessage(), 'confirmed')).value
    if (!Number.isFinite(feeLamports) || feeLamports === null) {
      throw new Error('Unable to resolve Solana fee quote')
    }
    return {
      fee: Number((feeLamports / LAMPORTS_PER_SOL).toFixed(9)),
      debugLabel: 'Solana live native quote',
      debugDetails: `SOL | lamportsPerTx=${feeLamports}`
    }
  })
}

async function estimateSolanaAssetTransferFee(input: EstimateTransactionFeePreviewInput): Promise<UtxoFeePreviewResult> {
  const rpcUrl = String(input.network.rpcUrl || '').trim()
  const fromAddress = String(input.fromAddress || '').trim()
  const toAddress = String(input.toAddress || '').trim()
  const assetId = String(input.assetId || '').trim()
  if (!rpcUrl) throw new Error('Missing Solana RPC URL')
  const sender = new PublicKey(fromAddress)
  const recipient = new PublicKey(toAddress)
  const mintAddress = extractSolanaMintFromAssetId(assetId)
  if (!mintAddress) throw new Error('Unable to resolve SPL mint address for fee estimation')
  const mint = new PublicKey(mintAddress)

  return await withSolanaPreviewConnection(rpcUrl, async (connection) => {
    const { decimals, tokenProgram } = await resolveSolanaMintMetadata(connection, mint)
    const amountRaw = parseSplAmountToRaw(String(input.amount || '').trim(), decimals)
    const sourceAta = getSolanaAssociatedTokenAddress(sender, mint, tokenProgram)
    const destinationAta = getSolanaAssociatedTokenAddress(recipient, mint, tokenProgram)
    const sourceInfo = await connection.getParsedAccountInfo(sourceAta, 'confirmed')
    if (!sourceInfo.value) throw new Error('Sender token account not found for the selected mint')

    const tx = new Transaction()
    const destinationInfo = await connection.getAccountInfo(destinationAta, 'confirmed')
    let rentLamports = 0
    if (!destinationInfo) {
      rentLamports = await connection.getMinimumBalanceForRentExemption(165, 'confirmed')
      tx.add(createSolanaAssociatedTokenAccountInstruction(
        sender,
        destinationAta,
        recipient,
        mint,
        tokenProgram
      ))
    }
    tx.add(createSolanaTransferCheckedInstruction(
      sourceAta,
      mint,
      destinationAta,
      sender,
      amountRaw,
      decimals,
      tokenProgram
    ))

    const { blockhash } = await connection.getLatestBlockhash('confirmed')
    tx.feePayer = sender
    tx.recentBlockhash = blockhash
    const feeLamports = (await connection.getFeeForMessage(tx.compileMessage(), 'confirmed')).value
    if (!Number.isFinite(feeLamports) || feeLamports === null) {
      throw new Error('Unable to resolve Solana SPL fee quote')
    }
    const totalLamports = feeLamports + rentLamports
    return {
      fee: Number((totalLamports / LAMPORTS_PER_SOL).toFixed(9)),
      debugLabel: 'Solana live asset quote',
      debugDetails: `SPL | txFee=${feeLamports} lamports | ataRent=${rentLamports} lamports`
    }
  })
}

function buildTronPreviewClient(rpcUrl: string): TronWeb {
  const apiKey = String((import.meta as any)?.env?.VITE_TRON_API_KEY || '').trim()
  return new TronWeb({
    fullHost: rpcUrl,
    headers: apiKey ? { 'TRON-PRO-API-KEY': apiKey } : undefined
  } as any)
}

function parseTronAmountToSun(amount: string): number {
  const raw = String(amount || '').trim()
  if (!/^\d+(\.\d+)?$/.test(raw)) throw new Error('Invalid TRX amount')
  const [whole, frac = ''] = raw.split('.')
  if (frac.length > 6) throw new Error('TRX supports up to 6 decimals')
  const sun = Number(`${whole}${frac.padEnd(6, '0')}`)
  if (!Number.isFinite(sun) || sun <= 0) throw new Error('Amount must be greater than 0')
  return Math.trunc(sun)
}

function parseTronLatestUnitPrice(raw: string, fallbackSun: number): number {
  const text = String(raw || '').trim()
  if (!text) return fallbackSun
  const lastEntry = text.split(',').map((v) => v.trim()).filter(Boolean).pop() || ''
  const candidate = lastEntry.includes(':')
    ? lastEntry.split(':').map((v) => v.trim()).filter(Boolean).pop() || ''
    : lastEntry
  const parsed = Number(candidate)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackSun
}

function parseTronChainParameterValue(params: Array<{ key?: string; value?: unknown }>, expectedKeys: string[]): number | null {
  const expected = new Set(expectedKeys.map((value) => String(value || '').trim().toLowerCase()))
  for (const row of params) {
    const key = String((row as any)?.key || '').trim().toLowerCase()
    if (!key || !expected.has(key)) continue
    const parsed = Number((row as any)?.value)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return null
}

function countTronTxBandwidthBytes(transaction: { raw_data_hex?: string; signature?: string[] } | null | undefined): number {
  const rawHex = String((transaction as any)?.raw_data_hex || '').trim()
  const rawBytes = rawHex && /^[0-9a-f]+$/i.test(rawHex) ? Math.ceil(rawHex.length / 2) : 0
  const signatures = Array.isArray((transaction as any)?.signature) ? (transaction as any).signature : []
  const signatureBytes = signatures.length > 0
    ? signatures.reduce((sum: number, sig: unknown) => {
        const hex = String(sig || '').trim()
        return sum + ((hex && /^[0-9a-f]+$/i.test(hex)) ? Math.ceil(hex.length / 2) : 67)
      }, 0)
    : 67
  return Math.max(0, rawBytes + signatureBytes)
}

function readTronAvailableEnergy(resources: Record<string, unknown> | null | undefined): number {
  const energyLimit = Number((resources as any)?.EnergyLimit ?? 0)
  const energyUsed = Number((resources as any)?.EnergyUsed ?? 0)
  const available = energyLimit - energyUsed
  return Number.isFinite(available) && available > 0 ? available : 0
}

async function resolveTronBandwidthPriceSun(tronWeb: TronWeb): Promise<number> {
  try {
    return parseTronLatestUnitPrice(await tronWeb.trx.getBandwidthPrices(), 1_000)
  } catch {
    try {
      const params = await tronWeb.trx.getChainParameters()
      return parseTronChainParameterValue(params as any, ['gettransactionfee', 'transactionfee']) || 1_000
    } catch {
      return 1_000
    }
  }
}

async function resolveTronEnergyPriceSun(tronWeb: TronWeb): Promise<number> {
  try {
    return parseTronLatestUnitPrice(await tronWeb.trx.getEnergyPrices(), 100)
  } catch {
    try {
      const params = await tronWeb.trx.getChainParameters()
      return parseTronChainParameterValue(params as any, ['getenergyfee', 'energyfee']) || 100
    } catch {
      return 100
    }
  }
}

async function estimateTronNativeTransferFee(input: EstimateTransactionFeePreviewInput): Promise<UtxoFeePreviewResult> {
  const rpcUrl = String(input.network.rpcUrl || '').trim()
  const fromAddress = String(input.fromAddress || '').trim()
  const toAddress = String(input.toAddress || '').trim()
  const amountSun = parseTronAmountToSun(String(input.amount || '').trim())
  if (!rpcUrl) throw new Error('Missing TRON RPC URL')
  if (!TronWeb.isAddress(fromAddress) || !TronWeb.isAddress(toAddress)) {
    throw new Error('Sender and recipient must be valid TRON addresses')
  }

  const tronWeb = buildTronPreviewClient(rpcUrl)
  const [unsignedTx, availableBandwidth, bandwidthPriceSun] = await Promise.all([
    tronWeb.transactionBuilder.sendTrx(toAddress, amountSun, fromAddress),
    tronWeb.trx.getBandwidth(fromAddress).catch(() => 0),
    resolveTronBandwidthPriceSun(tronWeb)
  ])

  const requiredBandwidth = countTronTxBandwidthBytes(unsignedTx as any)
  const paidBandwidth = Math.max(0, requiredBandwidth - Math.max(0, Number(availableBandwidth) || 0))
  const feeSun = paidBandwidth * bandwidthPriceSun

  return {
    fee: Number((feeSun / 1e6).toFixed(6)),
    debugLabel: 'TRON live native quote',
    debugDetails: `TRX | bandwidth=${requiredBandwidth}B | free=${Math.max(0, Number(availableBandwidth) || 0)} | paid=${paidBandwidth}B | price=${bandwidthPriceSun} sun/B`
  }
}

async function estimateTronAssetTransferFee(input: EstimateTransactionFeePreviewInput): Promise<UtxoFeePreviewResult> {
  const rpcUrl = String(input.network.rpcUrl || '').trim()
  const fromAddress = String(input.fromAddress || '').trim()
  const toAddress = String(input.toAddress || '').trim()
  const assetId = String(input.assetId || '').trim()
  const amount = String(input.amount || '').trim()
  const assetLogos = input.assetLogos || {}
  if (!rpcUrl) throw new Error('Missing TRON RPC URL')
  if (!TronWeb.isAddress(fromAddress) || !TronWeb.isAddress(toAddress)) {
    throw new Error('Sender and recipient must be valid TRON addresses')
  }

  let contractAddress = extractTronContractFromAssetId(assetId)
  if (!contractAddress) {
    contractAddress = extractTronContractFromLogoUri(String(assetLogos[assetId] || ''))
  }
  if (!contractAddress) throw new Error('Unable to resolve TRC20 contract address for fee estimation')

  const { decimals } = await readTrc20TokenMetadata(rpcUrl, contractAddress)
  const amountRaw = parseTrc20UiAmountToRaw(amount, decimals)
  const tronWeb = buildTronPreviewClient(rpcUrl)
  const parameters = [
    { type: 'address', value: toAddress },
    { type: 'uint256', value: amountRaw.toString() }
  ]

  const [energyEstimate, trigger, resources, availableBandwidth, bandwidthPriceSun, energyPriceSun] = await Promise.all([
    tronWeb.transactionBuilder.estimateEnergy(contractAddress, 'transfer(address,uint256)', {}, parameters, fromAddress).catch(() => null),
    tronWeb.transactionBuilder.triggerSmartContract(contractAddress, 'transfer(address,uint256)', { feeLimit: 20_000_000 }, parameters, fromAddress),
    tronWeb.trx.getAccountResources(fromAddress).catch(() => null),
    tronWeb.trx.getBandwidth(fromAddress).catch(() => 0),
    resolveTronBandwidthPriceSun(tronWeb),
    resolveTronEnergyPriceSun(tronWeb)
  ])

  const tx = (trigger as any)?.transaction
  if (!tx) throw new Error('Unable to build TRC20 transfer transaction for fee estimation')

  const requiredBandwidth = countTronTxBandwidthBytes(tx)
  const freeBandwidth = Math.max(0, Number(availableBandwidth) || 0)
  const paidBandwidth = Math.max(0, requiredBandwidth - freeBandwidth)
  const availableEnergy = readTronAvailableEnergy(resources as any)
  const requiredEnergy = Math.max(
    0,
    Number((energyEstimate as any)?.energy_required ?? 0)
      || Number((trigger as any)?.energy_required ?? 0)
      || Number((trigger as any)?.energy_used ?? 0)
      || 0
  )
  if (requiredEnergy <= 0) throw new Error('Unable to resolve TRC20 energy estimate')

  const paidEnergy = Math.max(0, requiredEnergy - availableEnergy)
  const feeSun = (paidBandwidth * bandwidthPriceSun) + (paidEnergy * energyPriceSun)

  return {
    fee: Number((feeSun / 1e6).toFixed(6)),
    debugLabel: 'TRON live asset quote',
    debugDetails: `TRC20 | bandwidth=${requiredBandwidth}B | paidBandwidth=${paidBandwidth}B | energy=${requiredEnergy} | paidEnergy=${paidEnergy} | energyPrice=${energyPriceSun} sun`
  }
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
    try {
      const { scanAddressUnspent } = await import('./utxoRpc')
      const scanned = await scanAddressUnspent(rpcConfig, senderAddress)
      if (scanned.length > 0) unspent = scanned
    } catch {
      // Chainstate scan may be unavailable on some providers.
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

function normalizeAssetToken(value: string): string {
  return String(value || '').trim().toUpperCase().replace(/[|#]/g, '/')
}

async function estimateUtxoAssetTransferFee(input: EstimateTransactionFeePreviewInput): Promise<UtxoFeePreviewResult> {
  const rpcConfig = buildRpcPreviewConfig(input.network)
  const senderAddress = String(input.fromAddress || '').trim()
  const assetId = String(input.assetId || '').trim()
  const amountCoins = Number(String(input.amount || '').trim())

  if (!senderAddress) throw new Error('Sender address is required for asset fee estimation')
  if (!assetId) throw new Error('Asset id is required for asset fee estimation')
  if (!Number.isFinite(amountCoins) || amountCoins <= 0) throw new Error('Amount must be greater than 0')

  const splitMatch = assetId.match(/^([^|/#:]+)[|/#:]([^|/#:]+)$/)
  const rootPart = splitMatch?.[1]?.trim() || ''
  const subPart = splitMatch?.[2]?.trim() || ''
  const requestedAssetNames = new Set([
    assetId,
    assetId.includes('|') ? assetId.replace('|', '/') : assetId,
    assetId.includes('/') ? assetId.replace('/', '|') : assetId,
    assetId.includes('|') ? assetId.replace('|', '#') : assetId,
    assetId.includes('/') ? assetId.replace('/', '#') : assetId,
    assetId.includes('#') ? assetId.replace('#', '/') : assetId,
    assetId.includes('#') ? assetId.replace('#', '|') : assetId,
    (rootPart && subPart) ? `${rootPart}${subPart}` : assetId,
    (rootPart && subPart) ? `${rootPart}/${subPart}` : assetId,
    (rootPart && subPart) ? `${rootPart}|${subPart}` : assetId,
    (rootPart && subPart) ? `${rootPart}#${subPart}` : assetId,
    assetId.toUpperCase(),
    ((rootPart && subPart) ? `${rootPart}/${subPart}` : assetId).toUpperCase(),
    ((rootPart && subPart) ? `${rootPart}|${subPart}` : assetId).toUpperCase(),
    ((rootPart && subPart) ? `${rootPart}#${subPart}` : assetId).toUpperCase(),
    ((rootPart && subPart) ? `${rootPart}${subPart}` : assetId).toUpperCase()
  ].map(normalizeAssetToken))

  const qtyRawSats = Math.round(amountCoins * 1e8)
  let allAssetUtxos = await listUnspentAssets(rpcConfig, senderAddress).catch(() => [])
  if (allAssetUtxos.length === 0 && !rpcConfig.useLocalRpc && String(rpcConfig.bridgeUrl || '').trim()) {
    allAssetUtxos = await fetchBridgeAddressAssetUtxos(rpcConfig, senderAddress).catch(() => [])
  }
  const spendableAssetUtxosRaw: Array<{ amountSats: number }> = []
  const spendableAssetUtxosCoinUnits: Array<{ amountSats: number }> = []

  for (const row of allAssetUtxos) {
    if (String((row as any)?.address ?? '').trim() !== senderAddress) continue
    if ((row as any)?.spendable === false) continue
    if (Number((row as any)?.confirmations ?? 0) < 1) continue

    const rowAssetId = String((row as any)?.assetId ?? '').trim()
    const rowAssetName = String((row as any)?.assetName ?? '').trim()
    const rawAmt = Number((row as any)?.amount ?? (row as any)?.satoshis ?? 0)

    const idMatches = rowAssetId && requestedAssetNames.has(normalizeAssetToken(rowAssetId))
    const nameMatches = rowAssetName && requestedAssetNames.has(normalizeAssetToken(rowAssetName))
    if ((!idMatches && !nameMatches) || !Number.isFinite(rawAmt) || rawAmt <= 0) continue

    spendableAssetUtxosRaw.push({ amountSats: Math.trunc(rawAmt) })
    spendableAssetUtxosCoinUnits.push({ amountSats: Math.round(rawAmt * 1e8) })
  }

  if (spendableAssetUtxosRaw.length === 0) {
    throw new Error(`No spendable asset UTXOs found for ${assetId} on ${senderAddress}`)
  }

  const totalAsRaw = spendableAssetUtxosRaw.reduce((sum, row) => sum + row.amountSats, 0)
  const totalAsCoinUnits = spendableAssetUtxosCoinUnits.reduce((sum, row) => sum + row.amountSats, 0)
  const normalizedAssetUtxos =
    totalAsRaw < qtyRawSats && totalAsCoinUnits >= qtyRawSats
      ? spendableAssetUtxosCoinUnits
      : spendableAssetUtxosRaw

  let selectedAssetInputCount = 0
  let assetAccumSats = 0
  for (const utxo of normalizedAssetUtxos.sort((a, b) => b.amountSats - a.amountSats)) {
    selectedAssetInputCount += 1
    assetAccumSats += utxo.amountSats
    if (assetAccumSats >= qtyRawSats) break
  }
  if (selectedAssetInputCount <= 0 || assetAccumSats < qtyRawSats) {
    throw new Error(`Insufficient ${assetId} balance in spendable UTXOs`)
  }

  let feeCoins: UtxoUnspent[] = []
  try {
    feeCoins = await getAddressUtxos(rpcConfig, senderAddress, 1)
  } catch {}
  if (feeCoins.length === 0) {
    try {
      feeCoins = await listUtxoUnspent(rpcConfig, senderAddress, 1)
    } catch {}
  }
  if (feeCoins.length === 0) {
    try {
      const { scanAddressUnspent } = await import('./utxoRpc')
      feeCoins = await scanAddressUnspent(rpcConfig, senderAddress)
    } catch {}
  }
  if (feeCoins.length === 0) {
    throw new Error(`No confirmed ${input.network.symbol} UTXOs available to estimate network fee`)
  }

  const feeRateResolution = await resolveUtxoFeeRateSats(rpcConfig, input.network)
  let feePerByteSats = feeRateResolution.feePerByteSats
  if (feePerByteSats > 500) feePerByteSats = Math.max(1, Math.round(feePerByteSats / 1000))

  const feePreset = String(input.utxoFeePreset || 'fast').trim().toLowerCase()
  if (feePreset === 'cheap') feePerByteSats = Math.max(1, Math.floor((feePerByteSats * 80) / 100))
  if (feePreset === 'premium') feePerByteSats = Math.max(1, Math.ceil((feePerByteSats * 145) / 100))

  const OVERHEAD_BYTES = 10
  const INPUT_BYTES = 148
  const OUTPUT_BYTES = 34
  const DUST_SATS = 1000
  const assetOutCount = qtyRawSats < assetAccumSats ? 2 : 1

  const selectedFeeInputs: UtxoUnspent[] = []
  let feeInputAccumSats = 0
  let finalFeeSats = 0
  for (const utxo of [...feeCoins].sort((a, b) => b.amount - a.amount)) {
    selectedFeeInputs.push(utxo)
    feeInputAccumSats += Math.round(Number(utxo.amount) * 1e8)

    const inputCount = selectedAssetInputCount + selectedFeeInputs.length
    const withChangeBytes = OVERHEAD_BYTES + INPUT_BYTES * inputCount + OUTPUT_BYTES * (assetOutCount + 1)
    const withChangeFee = withChangeBytes * feePerByteSats
    const withChangeLeft = feeInputAccumSats - withChangeFee
    if (withChangeLeft >= DUST_SATS) {
      finalFeeSats = withChangeFee
      break
    }

    const noChangeBytes = OVERHEAD_BYTES + INPUT_BYTES * inputCount + OUTPUT_BYTES * assetOutCount
    const noChangeFee = noChangeBytes * feePerByteSats
    if (feeInputAccumSats >= noChangeFee) {
      finalFeeSats = noChangeFee
      break
    }

    if (selectedFeeInputs.length >= 25) break
  }

  if (finalFeeSats <= 0) {
    throw new Error('Insufficient confirmed UTXOs to estimate asset transfer fee')
  }

  return {
    fee: Number((finalFeeSats / 1e8).toFixed(8)),
    debugLabel: `UTXO live asset quote via ${feeRateResolution.source}`,
    debugDetails: `${input.network.symbol} asset send | assetInputs=${selectedAssetInputCount} | feeInputs=${selectedFeeInputs.length} | feeRate=${feePerByteSats} sat/B | preset=${feePreset}`
  }
}

function estimateFeeFromResolvedEvmQuote(
  quote: EvmFeeQuote,
  input: Pick<
    EstimateTransactionFeePreviewInput,
    'gasLimit' | 'gasPrice' | 'maxFeePerGas' | 'maxPriorityFeePerGas' | 'type'
  >
): { feeWei: bigint; kind: TransactionFeePreviewKind; statusLabel: string } {
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
    return {
      feeWei: resolvedGasLimit * effectiveMaxFeePerGas,
      kind: 'max-cap',
      statusLabel: 'Live max fee cap'
    }
  }

  const effectiveGasPrice = manualGasPrice ?? quote.gasPrice ?? 1_000_000_000n
  return {
    feeWei: resolvedGasLimit * effectiveGasPrice,
    kind: 'estimate',
    statusLabel: 'Live network estimate'
  }
}

async function estimateEvmAssetTransferFee(
  input: EstimateTransactionFeePreviewInput
): Promise<{ feeWei: bigint; kind: TransactionFeePreviewKind; statusLabel: string }> {
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

  let tokenAddress = extractEvmTokenAddressFromAssetId(assetId)
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

async function estimateEvmNativeTransferFee(
  input: EstimateTransactionFeePreviewInput
): Promise<{ feeWei: bigint; kind: TransactionFeePreviewKind; statusLabel: string }> {
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
  const modelId = resolveRuntimeModelId(input.network as Network)

  if (!fromAddress) {
    return {
      fee: fallback,
      source: 'fallback',
      kind: 'estimate',
      isFinal: false,
      statusLabel: 'Fallback estimate',
      debugLabel: 'Fallback estimate',
      debugDetails: 'Missing sender address for fee preview.'
    }
  }

  try {
    if (input.network.coinType === 'EVM' && (toAddress || String(input.dataHex || '').trim())) {
      const resolvedPreview = input.isAssetTransfer
        ? await estimateEvmAssetTransferFee(input)
        : await estimateEvmNativeTransferFee(input)
      return {
        fee: Number(ethers.formatEther(resolvedPreview.feeWei)),
        source: 'live',
        kind: resolvedPreview.kind,
        isFinal: false,
        statusLabel: resolvedPreview.statusLabel,
        debugLabel: input.isAssetTransfer ? 'EVM live asset quote' : 'EVM live native quote',
        debugDetails: `${input.network.symbol} | lane=${String(input.gasLane || 'balanced')}`
      }
    }

    if (modelId === 'tron' && toAddress) {
      const preview = input.isAssetTransfer
        ? await estimateTronAssetTransferFee(input)
        : await estimateTronNativeTransferFee(input)
      return {
        fee: preview.fee,
        source: 'live',
        kind: 'estimate',
        isFinal: false,
        statusLabel: 'Live network estimate',
        debugLabel: preview.debugLabel,
        debugDetails: preview.debugDetails
      }
    }

    if (modelId === 'sol' && toAddress) {
      const preview = input.isAssetTransfer
        ? await estimateSolanaAssetTransferFee(input)
        : await estimateSolanaNativeTransferFee(input)
      return {
        fee: preview.fee,
        source: 'live',
        kind: 'estimate',
        isFinal: false,
        statusLabel: 'Live network estimate',
        debugLabel: preview.debugLabel,
        debugDetails: preview.debugDetails
      }
    }

    if (input.network.coinType === 'UTXO' && toAddress) {
      const preview = input.isAssetTransfer
        ? await estimateUtxoAssetTransferFee(input)
        : await estimateUtxoNativeTransferFee(input)
      return {
        fee: preview.fee,
        source: 'live',
        kind: 'estimate',
        isFinal: false,
        statusLabel: 'Live network estimate',
        debugLabel: preview.debugLabel,
        debugDetails: preview.debugDetails
      }
    }

    return {
      fee: fallback,
      source: 'fallback',
      kind: 'estimate',
      isFinal: false,
      statusLabel: 'Fallback estimate',
      debugLabel: 'Fallback estimate',
      debugDetails: `No live preview path for ${input.network.coinType}${input.isAssetTransfer ? ' asset send' : ' native send'}.`
    }
  } catch (error) {
    return {
      fee: fallback,
      source: 'fallback',
      kind: 'estimate',
      isFinal: false,
      statusLabel: 'Fallback estimate',
      debugLabel: 'Fallback estimate',
      debugDetails: compactPreviewError(error)
    }
  }
}
