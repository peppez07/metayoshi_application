import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { hexToBytes } from '@noble/hashes/utils'

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

  const connection = new Connection(params.rpcUrl, 'confirmed')
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
}
