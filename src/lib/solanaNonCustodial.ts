import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction
} from '@solana/web3.js'
import { hexToBytes } from '@noble/hashes/utils'

const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1Q2hvZbsiqW5xWH25efTNsLJA8knL')

function resolveSolanaRpcCandidates(rpcUrl: string): string[] {
  const primary = String(rpcUrl || '').trim()
  const defaults = ['https://api.mainnet-beta.solana.com', 'https://solana-rpc.publicnode.com']
  return Array.from(new Set([primary, ...defaults].filter(Boolean)))
}

function parseSolAmount(amount: string): bigint {
  const raw = String(amount || '').trim()
  if (!/^\d+(\.\d+)?$/.test(raw)) throw new Error('Invalid SOL amount')
  const [whole, frac = ''] = raw.split('.')
  if (frac.length > 9) throw new Error('SOL supports up to 9 decimals')
  const lamports = BigInt(`${whole}${frac.padEnd(9, '0')}`.replace(/^0+/, '') || '0')
  if (lamports <= 0n) throw new Error('Amount must be greater than 0')
  return lamports
}

export async function getSolanaBalance(rpcUrl: string, address: string): Promise<string> {
  const pubkey = new PublicKey(String(address || '').trim())
  let lastError: unknown = null
  for (const candidate of resolveSolanaRpcCandidates(rpcUrl)) {
    try {
      const connection = new Connection(candidate, 'confirmed')
      const lamports = await connection.getBalance(pubkey, 'confirmed')
      return (lamports / LAMPORTS_PER_SOL).toFixed(9).replace(/\.?0+$/, '')
    } catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Failed to query Solana balance from configured RPC endpoints')
}

function parseTokenAmount(amount: string, decimals: number): bigint {
  const raw = String(amount || '').trim()
  if (!/^\d+(\.\d+)?$/.test(raw)) throw new Error('Invalid SPL token amount')
  const [whole, frac = ''] = raw.split('.')
  if (frac.length > decimals) throw new Error(`Token supports up to ${decimals} decimals`)
  const asRaw = BigInt(`${whole}${frac.padEnd(decimals, '0')}`.replace(/^0+/, '') || '0')
  if (asRaw <= 0n) throw new Error('Token amount must be greater than 0')
  return asRaw
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

function normalizeMintAddress(assetId: string): string {
  const raw = String(assetId || '').trim()
  if (!raw) return ''
  const byColon = raw.split(':')
  const candidate = byColon[byColon.length - 1] || ''
  return candidate.trim()
}

function getAssociatedTokenAddress(owner: PublicKey, mint: PublicKey, tokenProgram: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), tokenProgram.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0]
}

function createAssociatedTokenAccountInstruction(
  payer: PublicKey,
  ata: PublicKey,
  owner: PublicKey,
  mint: PublicKey,
  tokenProgram: PublicKey
): TransactionInstruction {
  return new TransactionInstruction({
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
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

function createTransferCheckedInstruction(
  sourceAta: PublicKey,
  mint: PublicKey,
  destinationAta: PublicKey,
  owner: PublicKey,
  amountRaw: bigint,
  decimals: number,
  tokenProgram: PublicKey
): TransactionInstruction {
  const data = Buffer.concat([
    Buffer.from([12]), // TransferChecked
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

async function withSolanaConnection<T>(rpcUrl: string, task: (connection: Connection) => Promise<T>): Promise<T> {
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

async function resolveMintMetadata(connection: Connection, mint: PublicKey): Promise<{ decimals: number; tokenProgram: PublicKey }> {
  const info = await connection.getParsedAccountInfo(mint, 'confirmed')
  const owner = info.value?.owner
  const tokenProgram = owner?.equals(TOKEN_2022_PROGRAM_ID)
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID
  const parsed = (info.value?.data as any)?.parsed
  const decimals = Number(parsed?.info?.decimals ?? 0)
  if (!Number.isFinite(decimals) || decimals < 0 || decimals > 18) {
    throw new Error('Invalid mint decimals')
  }
  return { decimals: Math.trunc(decimals), tokenProgram }
}

export type SolanaTokenBalanceRow = {
  tokenId: string
  amountRaw: string
  amountUi: string
  decimals: number
  tokenProgram: string
  isNft: boolean
}

export async function listSolanaTokenBalances(rpcUrl: string, ownerAddress: string): Promise<SolanaTokenBalanceRow[]> {
  const owner = new PublicKey(String(ownerAddress || '').trim())
  return await withSolanaConnection(rpcUrl, async (connection) => {
    const programs = [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID]
    const rows: SolanaTokenBalanceRow[] = []
    for (const programId of programs) {
      const result = await connection.getParsedTokenAccountsByOwner(owner, { programId }, 'confirmed')
      for (const accountRow of result.value) {
        const parsed = (accountRow.account.data as any)?.parsed?.info
        const mint = String(parsed?.mint || '').trim()
        const tokenAmount = parsed?.tokenAmount
        const amountRaw = String(tokenAmount?.amount || '').trim()
        const amountUi = String(tokenAmount?.uiAmountString || '').trim()
        const decimals = Number(tokenAmount?.decimals ?? 0)
        if (!mint || !/^\d+$/.test(amountRaw)) continue
        const rawBig = BigInt(amountRaw)
        if (rawBig <= 0n) continue
        rows.push({
          tokenId: mint,
          amountRaw,
          amountUi: amountUi || '0',
          decimals: Number.isFinite(decimals) ? Math.max(0, Math.trunc(decimals)) : 0,
          tokenProgram: programId.toBase58(),
          isNft: decimals === 0 && rawBig === 1n
        })
      }
    }
    return rows
  })
}

export async function sendSolanaSplTokenNonCustodial(params: {
  rpcUrl: string
  fromAddress: string
  toAddress: string
  assetId: string
  amount: string
  privateKeyHex: string
}): Promise<{ hash: string }> {
  const fromAddress = String(params.fromAddress || '').trim()
  const toAddress = String(params.toAddress || '').trim()
  const mintAddress = normalizeMintAddress(params.assetId)
  if (!fromAddress) throw new Error('Solana sender address is required')
  if (!toAddress) throw new Error('Solana destination address is required')
  if (!mintAddress) throw new Error('SPL token mint address is required')

  const sender = Keypair.fromSeed(hexToBytes(String(params.privateKeyHex || '').trim()))
  const senderAddress = sender.publicKey.toBase58()
  if (senderAddress !== fromAddress) {
    throw new Error(`Derived SOL signer does not match active address (${senderAddress} != ${fromAddress})`)
  }

  const recipient = new PublicKey(toAddress)
  const mint = new PublicKey(mintAddress)

  return await withSolanaConnection(params.rpcUrl, async (connection) => {
    const { decimals, tokenProgram } = await resolveMintMetadata(connection, mint)
    const amountRaw = parseTokenAmount(params.amount, decimals)
    const sourceAta = getAssociatedTokenAddress(sender.publicKey, mint, tokenProgram)
    const destinationAta = getAssociatedTokenAddress(recipient, mint, tokenProgram)

    const sourceInfo = await connection.getParsedAccountInfo(sourceAta, 'confirmed')
    if (!sourceInfo.value) {
      throw new Error('Sender token account not found for the selected mint')
    }
    const sourceAmountRaw = String(((sourceInfo.value.data as any)?.parsed?.info?.tokenAmount?.amount) || '0').trim()
    const sourceAmount = /^\d+$/.test(sourceAmountRaw) ? BigInt(sourceAmountRaw) : 0n
    if (sourceAmount < amountRaw) {
      throw new Error('Insufficient token balance')
    }

    const tx = new Transaction()
    const destinationInfo = await connection.getAccountInfo(destinationAta, 'confirmed')
    if (!destinationInfo) {
      tx.add(createAssociatedTokenAccountInstruction(
        sender.publicKey,
        destinationAta,
        recipient,
        mint,
        tokenProgram
      ))
    }

    tx.add(createTransferCheckedInstruction(
      sourceAta,
      mint,
      destinationAta,
      sender.publicKey,
      amountRaw,
      decimals,
      tokenProgram
    ))

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
    tx.feePayer = sender.publicKey
    tx.recentBlockhash = blockhash
    tx.sign(sender)
    const signature = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false })
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed')
    return { hash: signature }
  })
}

export async function sendSolanaNonCustodial(params: {
  rpcUrl: string
  fromAddress: string
  toAddress: string
  amountSol: string
  privateKeyHex: string
}): Promise<{ hash: string }> {
  const fromAddress = String(params.fromAddress || '').trim()
  const toAddress = String(params.toAddress || '').trim()
  if (!fromAddress) throw new Error('Solana sender address is required')
  if (!toAddress) throw new Error('Solana destination address is required')

  const sender = Keypair.fromSeed(hexToBytes(String(params.privateKeyHex || '').trim()))
  const senderAddress = sender.publicKey.toBase58()
  if (senderAddress !== fromAddress) {
    throw new Error(`Derived SOL signer does not match active address (${senderAddress} != ${fromAddress})`)
  }

  const lamports = parseSolAmount(params.amountSol)
  const amountLamports = Number(lamports)
  if (!Number.isFinite(amountLamports) || amountLamports <= 0) throw new Error('Invalid SOL amount')

  return await withSolanaConnection(params.rpcUrl, async (connection) => {
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
    const tx = new Transaction({
      feePayer: sender.publicKey,
      recentBlockhash: blockhash
    }).add(
      SystemProgram.transfer({
        fromPubkey: sender.publicKey,
        toPubkey: new PublicKey(toAddress),
        lamports: amountLamports
      })
    )
    tx.sign(sender)
    const signature = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false })
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed')
    return { hash: signature }
  })
}
