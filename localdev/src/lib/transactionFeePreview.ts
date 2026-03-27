import { ethers } from 'ethers'
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction
} from '@solana/web3.js'
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc'
import { Transaction as SuiTransaction } from '@mysten/sui/transactions'
import type { Network } from '../coins'
import type { EvmGasLane, UtxoFeePreset, UtxoInputStrategy } from './coinFeatureModel'
import { estimateNetworkFeeUi } from './estimateNetworkFeeUi'
import { extractSolanaMintFromAssetId } from './assetTypes'
import { extractEvmTokenAddressFromAssetId, extractEvmTokenAddressFromLogoUri } from './evmAssetId'
import { estimateEvmTxFee, type EvmFeeQuote } from './evmFee'
import { normalizeTronRpcAddress, parseTrc20UiAmountToRaw, readTrc20TokenMetadata } from './tronNonCustodial'
import { extractTronContractFromAssetId, extractTronContractFromLogoUri } from './tronAssetId'
import { createSuiBridgeClient } from './suiBridgeClient'
import {
  estimateSolanaLamportsPerSignature,
  getSolanaAccountInfo,
  getSolanaLatestBlockhash,
  getSolanaParsedAccountInfo,
  SOLANA_ASSOCIATED_TOKEN_ACCOUNT_RENT_LAMPORTS
} from './solanaBridgeClient'
import { createStellarBridgeClient } from './stellarBridgeClient'
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
import { resolveCosmosAddressConfig } from './cosmosAddress'
import { resolveFeePreviewRecipient, resolveFeePreviewSender } from './feePreviewRecipient'

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
const SUI_NATIVE_COIN_TYPE = '0x2::sui::SUI'

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

function parseSuiAmountToMist(amount: string): bigint {
  const raw = String(amount || '').trim()
  if (!/^\d+(\.\d+)?$/.test(raw)) throw new Error('Invalid SUI amount')
  const [whole, frac = ''] = raw.split('.')
  if (frac.length > 9) throw new Error('SUI supports up to 9 decimals')
  const mist = BigInt(`${whole}${frac.padEnd(9, '0')}`.replace(/^0+/, '') || '0')
  if (mist <= 0n) throw new Error('Amount must be greater than 0')
  return mist
}

function parseSuiTokenAmountToRaw(amount: string, decimals: number, label: string): bigint {
  const raw = String(amount || '').trim()
  if (!/^\d+(\.\d+)?$/.test(raw)) throw new Error(`Invalid ${label} amount`)
  const [whole, frac = ''] = raw.split('.')
  if (frac.length > decimals) throw new Error(`${label} supports up to ${decimals} decimals`)
  const amountRaw = BigInt(`${whole}${frac.padEnd(decimals, '0')}`.replace(/^0+/, '') || '0')
  if (amountRaw <= 0n) throw new Error(`${label} amount must be greater than 0`)
  return amountRaw
}

function createSuiPreviewClient(rpcConfig: UtxoRpcConfig): SuiJsonRpcClient {
  return createSuiBridgeClient(rpcConfig)
}

async function listSuiCoinObjectsForPreview(
  client: SuiJsonRpcClient,
  owner: string,
  coinType: string
): Promise<Array<{ coinObjectId: string; balance: bigint }>> {
  const rows: Array<{ coinObjectId: string; balance: bigint }> = []
  let cursor: string | null | undefined = null

  while (true) {
    const page = await client.getCoins({
      owner,
      coinType,
      cursor,
      limit: 50
    })
    for (const row of page.data || []) {
      const coinObjectId = String((row as any)?.coinObjectId || '').trim()
      const balanceText = String((row as any)?.balance || '').trim()
      if (!coinObjectId || !/^\d+$/.test(balanceText)) continue
      const balance = BigInt(balanceText)
      if (balance <= 0n) continue
      rows.push({ coinObjectId, balance })
    }
    if (!page.hasNextPage || !page.nextCursor) break
    cursor = page.nextCursor
  }

  rows.sort((a, b) => {
    if (a.balance === b.balance) return a.coinObjectId.localeCompare(b.coinObjectId)
    return a.balance > b.balance ? -1 : 1
  })
  return rows
}

function parseSuiNftAssetKey(assetId: string): { objectId: string } | null {
  const match = String(assetId || '').trim().match(/^SUINFT:(0x[a-fA-F0-9]+)$/)
  if (!match) return null
  return { objectId: match[1] }
}

function computeSuiGasFeeMist(gasUsed: any): bigint {
  const computationCost = BigInt(String(gasUsed?.computationCost || '0'))
  const storageCost = BigInt(String(gasUsed?.storageCost || '0'))
  const storageRebate = BigInt(String(gasUsed?.storageRebate || '0'))
  const feeMist = computationCost + storageCost - storageRebate
  return feeMist > 0n ? feeMist : 0n
}

async function estimateSuiTransferFee(
  input: EstimateTransactionFeePreviewInput
): Promise<{ feeMist: bigint; debugDetails: string }> {
  const fromAddress = String(input.fromAddress || '').trim()
  const toAddress = String(input.toAddress || '').trim()
  if (!fromAddress || !toAddress) throw new Error('Sender and recipient are required for Sui fee estimation')

  const rpcConfig = buildRpcPreviewConfig(input.network)
  const client = createSuiPreviewClient(rpcConfig)
  const tx = new SuiTransaction()
  tx.setSender(fromAddress)

  if (input.isAssetTransfer) {
    const assetId = String(input.assetId || '').trim()
    if (!assetId) throw new Error('Asset id is required for Sui asset fee estimation')
    const nft = parseSuiNftAssetKey(assetId)
    if (nft) {
      tx.transferObjects([nft.objectId], toAddress)
    } else {
      const metadata = await client.getCoinMetadata({ coinType: assetId }).catch(() => null as any)
      const decimalsRaw = Number((metadata as any)?.decimals)
      const decimals = Number.isInteger(decimalsRaw) && decimalsRaw >= 0 && decimalsRaw <= 30 ? decimalsRaw : 9
      const assetLabel = String((metadata as any)?.symbol || (metadata as any)?.name || assetId).trim() || assetId
      const amountRaw = parseSuiTokenAmountToRaw(String(input.amount || '').trim(), decimals, assetLabel)
      const coins = await listSuiCoinObjectsForPreview(client, fromAddress, assetId)

      let selectedTotal = 0n
      const selectedIds: string[] = []
      for (const row of coins) {
        selectedIds.push(row.coinObjectId)
        selectedTotal += row.balance
        if (selectedTotal >= amountRaw) break
      }
      if (selectedTotal < amountRaw || selectedIds.length === 0) {
        throw new Error(`Insufficient ${assetLabel} balance`)
      }

      const primaryCoinId = selectedIds[0]
      if (selectedIds.length > 1) {
        tx.mergeCoins(primaryCoinId, selectedIds.slice(1))
      }
      const [transferCoin] = tx.splitCoins(primaryCoinId, [amountRaw])
      tx.transferObjects([transferCoin], toAddress)
    }
  } else {
    const amountMist = parseSuiAmountToMist(String(input.amount || '').trim())
    const [coin] = tx.splitCoins(tx.gas, [amountMist])
    tx.transferObjects([coin], toAddress)
  }

  const bytes = await tx.build({ client })
  const result = await client.dryRunTransactionBlock({ transactionBlock: bytes })
  const feeMist = computeSuiGasFeeMist((result as any)?.effects?.gasUsed)
  return {
    feeMist,
    debugDetails: `SUI | txBytes=${bytes.length} | mode=${input.isAssetTransfer ? 'asset' : 'native'}`
  }
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

async function resolveSolanaMintMetadata(rpcConfig: UtxoRpcConfig, mint: PublicKey): Promise<{ decimals: number; tokenProgram: PublicKey }> {
  const info = await getSolanaParsedAccountInfo(rpcConfig, mint.toBase58())
  const ownerBase58 = String((info as any)?.owner?.toBase58?.() || (info as any)?.owner || '').trim()
  const tokenProgram = ownerBase58 === SOL_TOKEN_2022_PROGRAM_ID.toBase58() ? SOL_TOKEN_2022_PROGRAM_ID : SOL_TOKEN_PROGRAM_ID
  const parsed = (info as any)?.data?.parsed ?? (info as any)?.parsed
  const decimals = Number(parsed?.info?.decimals ?? 0)
  if (!Number.isFinite(decimals) || decimals < 0 || decimals > 18) {
    throw new Error('Invalid mint decimals')
  }
  return { decimals: Math.trunc(decimals), tokenProgram }
}

async function estimateSolanaNativeTransferFee(input: EstimateTransactionFeePreviewInput): Promise<UtxoFeePreviewResult> {
  const rpcConfig = buildRpcPreviewConfig(input.network)
  const fromAddress = String(input.fromAddress || '').trim()
  const toAddress = String(input.toAddress || '').trim()
  const from = new PublicKey(fromAddress)
  const to = new PublicKey(toAddress)
  const lamports = parseSolAmountToLamports(String(input.amount || '').trim())
  const tx = new Transaction().add(SystemProgram.transfer({
    fromPubkey: from,
    toPubkey: to,
    lamports: Number(lamports)
  }))
  const { blockhash } = await getSolanaLatestBlockhash(rpcConfig)
  tx.feePayer = from
  tx.recentBlockhash = blockhash
  const feeResolution = await estimateSolanaLamportsPerSignature(rpcConfig, tx.compileMessage().serialize())
  const feeLamports = feeResolution.feeLamports
  return {
    fee: Number((feeLamports / LAMPORTS_PER_SOL).toFixed(9)),
    debugLabel: 'Solana live native quote',
    debugDetails: `SOL | lamportsPerTx=${feeLamports} | feeMode=${feeResolution.mode}`
  }
}

async function estimateSolanaAssetTransferFee(input: EstimateTransactionFeePreviewInput): Promise<UtxoFeePreviewResult> {
  const rpcConfig = buildRpcPreviewConfig(input.network)
  const fromAddress = String(input.fromAddress || '').trim()
  const toAddress = String(input.toAddress || '').trim()
  const assetId = String(input.assetId || '').trim()
  const sender = new PublicKey(fromAddress)
  const recipient = new PublicKey(toAddress)
  const mintAddress = extractSolanaMintFromAssetId(assetId)
  if (!mintAddress) throw new Error('Unable to resolve SPL mint address for fee estimation')
  const mint = new PublicKey(mintAddress)

  const { decimals, tokenProgram } = await resolveSolanaMintMetadata(rpcConfig, mint)
  const amountRaw = parseSplAmountToRaw(String(input.amount || '').trim(), decimals)
  const sourceAta = getSolanaAssociatedTokenAddress(sender, mint, tokenProgram)
  const destinationAta = getSolanaAssociatedTokenAddress(recipient, mint, tokenProgram)
  const sourceInfo = await getSolanaParsedAccountInfo(rpcConfig, sourceAta.toBase58())
  if (!sourceInfo) throw new Error('Sender token account not found for the selected mint')

  const tx = new Transaction()
  const destinationInfo = await getSolanaAccountInfo(rpcConfig, destinationAta.toBase58())
  let rentLamports = 0
  if (!destinationInfo) {
    // MetaYoshi's Solana bridge does not currently expose rent-exemption lookup, so use the canonical ATA size amount.
    rentLamports = SOLANA_ASSOCIATED_TOKEN_ACCOUNT_RENT_LAMPORTS
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

  const { blockhash } = await getSolanaLatestBlockhash(rpcConfig)
  tx.feePayer = sender
  tx.recentBlockhash = blockhash
  const feeResolution = await estimateSolanaLamportsPerSignature(rpcConfig, tx.compileMessage().serialize())
  const feeLamports = feeResolution.feeLamports
  const totalLamports = feeLamports + rentLamports
  return {
    fee: Number((totalLamports / LAMPORTS_PER_SOL).toFixed(9)),
    debugLabel: 'Solana live asset quote',
    debugDetails: `SPL | txFee=${feeLamports} lamports | ataRent=${rentLamports} lamports | feeMode=${feeResolution.mode}`
  }
}

function parseTronAmountToSun(amount: string): bigint {
  const raw = String(amount || '').trim()
  if (!/^\d+(\.\d+)?$/.test(raw)) throw new Error('Invalid TRX amount')
  const [whole, frac = ''] = raw.split('.')
  if (frac.length > 6) throw new Error('TRX supports up to 6 decimals')
  const sun = BigInt(`${whole}${frac.padEnd(6, '0')}`.replace(/^0+/, '') || '0')
  if (sun <= 0n) throw new Error('Amount must be greater than 0')
  return sun
}

async function estimateTronNativeTransferFee(input: EstimateTransactionFeePreviewInput): Promise<UtxoFeePreviewResult> {
  const rpcConfig = buildRpcPreviewConfig(input.network)
  const fromAddress = String(input.fromAddress || '').trim()
  const toAddress = String(input.toAddress || '').trim()
  const amountSun = parseTronAmountToSun(String(input.amount || '').trim())
  const fromHex = await normalizeTronRpcAddress(fromAddress)
  const toHex = await normalizeTronRpcAddress(toAddress)
  const quote = await estimateEvmTxFee({
    rpcConfig,
    from: fromHex,
    to: toHex,
    valueWei: amountSun,
    fallbackGasLimitHex: '0x5208',
    lane: input.gasLane
  })
  const feeSun = quote.estimatedFeeWei

  return {
    fee: Number(feeSun) / 1e6,
    debugLabel: 'TRON live native quote',
    debugDetails: `TRX | gasLimit=${quote.gasLimit.toString()} | feeSun=${feeSun.toString()}`
  }
}

async function estimateTronAssetTransferFee(input: EstimateTransactionFeePreviewInput): Promise<UtxoFeePreviewResult> {
  const rpcConfig = buildRpcPreviewConfig(input.network)
  const fromAddress = String(input.fromAddress || '').trim()
  const toAddress = String(input.toAddress || '').trim()
  const assetId = String(input.assetId || '').trim()
  const amount = String(input.amount || '').trim()
  const assetLogos = input.assetLogos || {}

  let contractAddress = extractTronContractFromAssetId(assetId)
  if (!contractAddress) {
    contractAddress = extractTronContractFromLogoUri(String(assetLogos[assetId] || ''))
  }
  if (!contractAddress) throw new Error('Unable to resolve TRC20 contract address for fee estimation')

  const { decimals } = await readTrc20TokenMetadata(rpcConfig, contractAddress)
  const amountRaw = parseTrc20UiAmountToRaw(amount, decimals)
  const fromHex = await normalizeTronRpcAddress(fromAddress)
  const toHex = await normalizeTronRpcAddress(toAddress)
  const contractHex = await normalizeTronRpcAddress(contractAddress)
  const transferData = EVM_ERC20_IFACE.encodeFunctionData('transfer', [toHex, amountRaw])
  const quote = await estimateEvmTxFee({
    rpcConfig,
    from: fromHex,
    to: contractHex,
    data: transferData,
    valueWei: 0n,
    fallbackGasLimitHex: '0x186a0',
    lane: input.gasLane
  })
  const feeSun = quote.estimatedFeeWei

  return {
    fee: Number(feeSun) / 1e6,
    debugLabel: 'TRON live asset quote',
    debugDetails: `TRC20 | gasLimit=${quote.gasLimit.toString()} | feeSun=${feeSun.toString()}`
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

function estimateCosmosConfiguredFee(
  input: EstimateTransactionFeePreviewInput
): TransactionFeePreviewResult {
  const cfg = resolveCosmosAddressConfig({
    id: input.network.id,
    runtimeModelId: input.network.runtimeModelId
  })
  const feeAtomic = BigInt(String(cfg.feeAmountRaw || '0').trim() || '0')
  const decimals = Math.max(0, Number(cfg.decimals || 0))
  const fee = Number(feeAtomic) / (10 ** decimals)
  return {
    fee: Number.isFinite(fee) && fee > 0 ? fee : estimateNetworkFeeUi(input.network as Network),
    source: 'live',
    kind: 'estimate',
    isFinal: false,
    statusLabel: 'Configured network fee',
    debugLabel: 'Cosmos configured fee',
    debugDetails: `${cfg.symbol} | fee=${cfg.feeAmountRaw} ${cfg.feeDenom} | gas=${cfg.gasLimit}`
  }
}

export async function estimateTransactionFeePreview(
  input: EstimateTransactionFeePreviewInput
): Promise<TransactionFeePreviewResult> {
  const fallback = estimateNetworkFeeUi(input.network as Network)
  const fromAddress = String(input.fromAddress || '').trim()
  const toAddress = String(input.toAddress || '').trim()
  const previewSender = resolveFeePreviewSender(input.network as Network, fromAddress)
  const previewRecipient = resolveFeePreviewRecipient(input.network as Network, previewSender, toAddress)
  const modelId = resolveRuntimeModelId(input.network as Network)
  const isSolanaModel = input.network.coinType === 'SOL' || modelId === 'sol' || modelId === 'solana'

  if (!previewSender) {
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
    if (input.network.coinType === 'EVM' && (previewRecipient || String(input.dataHex || '').trim())) {
      const resolvedPreview = input.isAssetTransfer
        ? await estimateEvmAssetTransferFee({ ...input, fromAddress: previewSender, toAddress: previewRecipient })
        : await estimateEvmNativeTransferFee({ ...input, fromAddress: previewSender, toAddress: previewRecipient })
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

    if (modelId === 'tron' && previewRecipient) {
      const preview = input.isAssetTransfer
        ? await estimateTronAssetTransferFee({ ...input, fromAddress: previewSender, toAddress: previewRecipient })
        : await estimateTronNativeTransferFee({ ...input, fromAddress: previewSender, toAddress: previewRecipient })
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

    if (isSolanaModel && previewRecipient) {
      const preview = input.isAssetTransfer
        ? await estimateSolanaAssetTransferFee({ ...input, fromAddress: previewSender, toAddress: previewRecipient })
        : await estimateSolanaNativeTransferFee({ ...input, fromAddress: previewSender, toAddress: previewRecipient })
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

    if (modelId === 'sui' && previewRecipient) {
      const preview = await estimateSuiTransferFee({ ...input, fromAddress: previewSender, toAddress: previewRecipient })
      return {
        fee: Number((preview.feeMist.toString())) / 1e9,
        source: 'live',
        kind: 'estimate',
        isFinal: false,
        statusLabel: 'Live network estimate',
        debugLabel: input.isAssetTransfer ? 'Sui live asset quote' : 'Sui live native quote',
        debugDetails: preview.debugDetails
      }
    }

    if (modelId === 'xlm' && previewRecipient) {
      const rpcConfig = buildRpcPreviewConfig(input.network)
      const client = createStellarBridgeClient({
        bridgeUrl: rpcConfig.bridgeUrl,
        bridgeUsername: rpcConfig.bridgeUsername,
        bridgePassword: rpcConfig.bridgePassword,
        timeoutMs: Number(rpcConfig.timeoutMs ?? PREVIEW_RPC_TIMEOUT_MS)
      })
      const stats = await client.getFeeStats()
      const fee = Number(stats.baseFeeStroops || 0) / 1e7
      return {
        fee,
        source: 'live',
        kind: 'estimate',
        isFinal: false,
        statusLabel: 'Live network estimate',
        debugLabel: input.isAssetTransfer ? 'Stellar live asset quote' : 'Stellar live native quote',
        debugDetails: `XLM | baseFee=${String(stats.baseFeeStroops || 0)} stroops`
      }
    }

    if (input.network.coinType === 'UTXO' && previewRecipient) {
      const preview = input.isAssetTransfer
        ? await estimateUtxoAssetTransferFee({ ...input, fromAddress: previewSender, toAddress: previewRecipient })
        : await estimateUtxoNativeTransferFee({ ...input, fromAddress: previewSender, toAddress: previewRecipient })
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

    if (input.network.coinType === 'COSMOS' && previewRecipient) {
      return estimateCosmosConfiguredFee(input)
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
