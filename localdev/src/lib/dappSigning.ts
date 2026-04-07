import * as secp from '@noble/secp256k1'
import { sha256 } from '@noble/hashes/sha256'
import { hmac } from '@noble/hashes/hmac'
import { hexToBytes, bytesToHex } from '@noble/hashes/utils'
import nacl from 'tweetnacl'
import {
  Transaction,
  VersionedTransaction,
  Keypair
} from '@solana/web3.js'
import { resolveEvmExternalSigner } from './evmExternalSigner'
import { deriveSolanaAddress } from './solanaAddress'
import { deriveCosmosAddress, resolveCosmosAddressConfig } from './cosmosAddress'
import { deriveUtxoAddress } from './utxoAddress'
import {
  createEvmSignerAdapter,
  normalizeEvmTransactionInput,
  type EvmTransactionInput
} from './evmSignerAdapter'
import type { Network } from '../coins'
import { sendBridgeEvmSignedRelay, sendBridgeSolanaSignedRelay, type UtxoRpcConfig } from './utxoRpc'

type JsonObject = Record<string, any>

// Raptoreum Core still verifies compact signed messages with Dash's historical
// magic prefix, so RTM dapp auth must match that exact envelope.
const RTM_SIGNED_MESSAGE_MAGIC = 'DarkCoin Signed Message:\n'

// noble v3 requires host apps to wire hash helpers before using sync signing APIs.
if (!secp.hashes.sha256) {
  secp.hashes.sha256 = (msg: Uint8Array) => sha256(msg)
}
if (!secp.hashes.hmacSha256) {
  secp.hashes.hmacSha256 = (key: Uint8Array, msg: Uint8Array) => hmac(sha256, key, msg)
}

function utf8(input: string): Uint8Array {
  return new TextEncoder().encode(String(input || ''))
}

function concatBytes(...chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

function toBase64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 1) out += String.fromCharCode(bytes[i])
  return btoa(out)
}

function fromBase64(value: string): Uint8Array {
  const normalized = String(value || '').trim()
  if (!normalized) throw new Error('Base64 payload is required')
  const raw = atob(normalized)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i)
  return out
}

function normalizeHexData(input: string): Uint8Array {
  const value = String(input || '').trim()
  if (!/^0x[0-9a-f]*$/i.test(value) || value.length % 2 !== 0) {
    throw new Error('Expected 0x-prefixed hex data')
  }
  return hexToBytes(value.slice(2))
}

function normalizeMessageBytes(input: string, encoding: 'utf8' | 'hex' | 'base64' = 'utf8'): Uint8Array {
  if (encoding === 'hex') return normalizeHexData(input)
  if (encoding === 'base64') return fromBase64(input)
  return utf8(input)
}

function resolveAccountIndex(accountIndex?: number): number {
  return Number.isInteger(accountIndex) && Number(accountIndex) >= 0 ? Number(accountIndex) : 0
}

function parseTypedDataPayload(raw: unknown): { domain: JsonObject; types: JsonObject; message: JsonObject; primaryType?: string } {
  const payload = typeof raw === 'string' ? JSON.parse(raw) : raw
  if (!payload || typeof payload !== 'object') throw new Error('Typed data payload must be an object')
  const typed = payload as JsonObject
  if (!typed.domain || !typed.types || !typed.message) {
    throw new Error('Typed data payload must include domain, types, and message')
  }
  const types = { ...typed.types }
  delete (types as JsonObject).EIP712Domain
  return {
    domain: typed.domain as JsonObject,
    types: types as JsonObject,
    message: typed.message as JsonObject,
    primaryType: typeof typed.primaryType === 'string' ? typed.primaryType : undefined
  }
}

function stableAminoValue(value: any): any {
  if (Array.isArray(value)) return value.map((entry) => stableAminoValue(entry))
  if (!value || typeof value !== 'object') return value
  const out: Record<string, any> = {}
  for (const key of Object.keys(value).sort()) {
    const next = value[key]
    if (next === undefined) continue
    out[key] = stableAminoValue(next)
  }
  return out
}

function encodeVarint(value: bigint): Uint8Array {
  if (value < 0n) throw new Error('Varint value must be unsigned')
  const out: number[] = []
  let n = value
  while (n >= 0x80n) {
    out.push(Number((n & 0x7fn) | 0x80n))
    n >>= 7n
  }
  out.push(Number(n))
  return new Uint8Array(out)
}

function encodeCompactSize(value: number): Uint8Array {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error('Compact size requires a non-negative safe integer')
  }
  if (value < 253) return Uint8Array.from([value])
  if (value <= 0xffff) {
    return Uint8Array.from([253, value & 0xff, (value >> 8) & 0xff])
  }
  if (value <= 0xffffffff) {
    return Uint8Array.from([
      254,
      value & 0xff,
      (value >> 8) & 0xff,
      (value >> 16) & 0xff,
      (value >> 24) & 0xff
    ])
  }
  let next = BigInt(value)
  const out = new Uint8Array(9)
  out[0] = 255
  for (let i = 1; i < out.length; i += 1) {
    out[i] = Number(next & 0xffn)
    next >>= 8n
  }
  return out
}

function buildRtmMessageDigest(message: string): Uint8Array {
  const magicBytes = utf8(RTM_SIGNED_MESSAGE_MAGIC)
  const messageBytes = utf8(message)
  const payload = concatBytes(
    encodeCompactSize(magicBytes.length),
    magicBytes,
    encodeCompactSize(messageBytes.length),
    messageBytes
  )
  return sha256(sha256(payload))
}

function fieldKey(fieldNo: number, wireType: 0 | 2): Uint8Array {
  return encodeVarint(BigInt((fieldNo << 3) | wireType))
}

function encodeFieldVarint(fieldNo: number, value: bigint): Uint8Array {
  return concatBytes(fieldKey(fieldNo, 0), encodeVarint(value))
}

function encodeFieldBytes(fieldNo: number, bytes: Uint8Array): Uint8Array {
  return concatBytes(fieldKey(fieldNo, 2), encodeVarint(BigInt(bytes.length)), bytes)
}

function encodeFieldString(fieldNo: number, value: string): Uint8Array {
  return encodeFieldBytes(fieldNo, utf8(value))
}

function encodeSignDoc(input: {
  bodyBytes: Uint8Array
  authInfoBytes: Uint8Array
  chainId: string
  accountNumber: bigint
}): Uint8Array {
  return concatBytes(
    encodeFieldBytes(1, input.bodyBytes),
    encodeFieldBytes(2, input.authInfoBytes),
    encodeFieldString(3, input.chainId),
    encodeFieldVarint(4, input.accountNumber)
  )
}

function encodeTxRaw(input: {
  bodyBytes: Uint8Array
  authInfoBytes: Uint8Array
  signature: Uint8Array
}): Uint8Array {
  return concatBytes(
    encodeFieldBytes(1, input.bodyBytes),
    encodeFieldBytes(2, input.authInfoBytes),
    encodeFieldBytes(3, input.signature)
  )
}

function deriveCosmosRestCandidates(rpcUrl: string): string[] {
  const raw = String(rpcUrl || '').trim().replace(/\/+$/, '')
  if (!raw) return []
  const out = new Set<string>([raw])
  try {
    const parsed = new URL(raw)
    const host = String(parsed.host || '').toLowerCase()
    out.add(`${parsed.protocol}//${host.replace('-rpc.publicnode.com', '-rest.publicnode.com')}`)
    out.add(`${parsed.protocol}//${host.replace('-rpc.publicnode.com', '-api.publicnode.com')}`)
  } catch {
    // Keep original URL only.
  }
  return [...out].filter(Boolean)
}

export async function signEvmMessage(input: {
  mnemonic: string
  accountIndex?: number
  message: string
  encoding?: 'utf8' | 'hex'
}): Promise<string> {
  const messageBytes = normalizeMessageBytes(input.message, input.encoding || 'utf8')
  const adapter = createEvmSignerAdapter({
    mnemonic: input.mnemonic,
    accountIndex: input.accountIndex,
    externalSigner: await resolveEvmExternalSigner()
  })
  return await adapter.signMessage(messageBytes)
}

export async function signRtmMessage(input: {
  mnemonic: string
  accountIndex?: number
  message: string
  address?: string
}): Promise<{
  address: string
  signature: string
  signingScheme: 'rtm-signmessage'
}> {
  const derived = await deriveUtxoAddress(input.mnemonic, 'RTM', resolveAccountIndex(input.accountIndex))
  const expectedAddress = String(input.address || '').trim()
  if (expectedAddress && expectedAddress !== derived.address) {
    throw new Error('Requested RTM address does not match the selected wallet account')
  }

  const digest = buildRtmMessageDigest(String(input.message || ''))
  const recovered = secp.sign(digest, hexToBytes(derived.privHex), {
    prehash: false,
    lowS: true,
    format: 'recovered'
  })
  const parsed = secp.Signature.fromBytes(recovered, 'recovered')
  if (typeof parsed.recovery !== 'number') {
    throw new Error('Failed to derive RTM recovery id')
  }
  const compact = parsed.toBytes('compact')
  const header = Uint8Array.from([27 + parsed.recovery + 4])
  return {
    address: derived.address,
    signature: toBase64(concatBytes(header, compact)),
    signingScheme: 'rtm-signmessage'
  }
}

export async function signEvmTypedData(input: {
  mnemonic: string
  accountIndex?: number
  typedData: unknown
}): Promise<string> {
  const parsed = parseTypedDataPayload(input.typedData)
  const adapter = createEvmSignerAdapter({
    mnemonic: input.mnemonic,
    accountIndex: input.accountIndex,
    externalSigner: await resolveEvmExternalSigner()
  })
  return await adapter.signTypedData(parsed.domain, parsed.types, parsed.message)
}

export async function signEvmTransaction(input: {
  mnemonic: string
  accountIndex?: number
  tx: EvmTransactionInput
}): Promise<string> {
  const adapter = createEvmSignerAdapter({
    mnemonic: input.mnemonic,
    accountIndex: input.accountIndex,
    externalSigner: await resolveEvmExternalSigner()
  })
  return await adapter.signTransaction(normalizeEvmTransactionInput(input.tx))
}

export async function signAndSendEvmTransaction(input: {
  mnemonic: string
  accountIndex?: number
  rpcConfig: UtxoRpcConfig
  tx: EvmTransactionInput
}): Promise<{ hash: string }> {
  const normalizedTx = normalizeEvmTransactionInput(input.tx)
  const adapter = createEvmSignerAdapter({
    mnemonic: input.mnemonic,
    accountIndex: input.accountIndex,
    externalSigner: await resolveEvmExternalSigner()
  })
  if (adapter.sendTransaction) {
    return await adapter.sendTransaction(normalizedTx)
  }
  const signedTx = await adapter.signTransaction(normalizedTx)
  const relayed = await sendBridgeEvmSignedRelay(input.rpcConfig, {
    kind: 'coin',
    signedTxHex: signedTx
  })
  return { hash: String(relayed.txid || '').trim() }
}

export async function signSolanaMessage(input: {
  mnemonic: string
  accountIndex?: number
  messageBase64: string
}): Promise<{ publicKey: string; signatureBase64: string }> {
  const derived = await deriveSolanaAddress(input.mnemonic, resolveAccountIndex(input.accountIndex))
  const keypair = Keypair.fromSeed(hexToBytes(derived.privHex))
  const messageBytes = fromBase64(input.messageBase64)
  const signature = nacl.sign.detached(messageBytes, keypair.secretKey)
  return {
    publicKey: derived.address,
    signatureBase64: toBase64(signature)
  }
}

function signSolanaSerializedTransaction(serializedTxBase64: string, keypair: Keypair): string {
  const serialized = fromBase64(serializedTxBase64)
  try {
    const tx = VersionedTransaction.deserialize(serialized)
    tx.sign([keypair])
    return toBase64(tx.serialize())
  } catch {
    const tx = Transaction.from(serialized)
    tx.partialSign(keypair)
    return toBase64(tx.serialize({ requireAllSignatures: false, verifySignatures: false }))
  }
}

export async function signSolanaTransaction(input: {
  mnemonic: string
  accountIndex?: number
  serializedTxBase64: string
}): Promise<string> {
  const derived = await deriveSolanaAddress(input.mnemonic, resolveAccountIndex(input.accountIndex))
  const keypair = Keypair.fromSeed(hexToBytes(derived.privHex))
  return signSolanaSerializedTransaction(input.serializedTxBase64, keypair)
}

export async function signSolanaTransactions(input: {
  mnemonic: string
  accountIndex?: number
  serializedTxsBase64: string[]
}): Promise<string[]> {
  const derived = await deriveSolanaAddress(input.mnemonic, resolveAccountIndex(input.accountIndex))
  const keypair = Keypair.fromSeed(hexToBytes(derived.privHex))
  return input.serializedTxsBase64.map((row) => signSolanaSerializedTransaction(row, keypair))
}

export async function signAndSendSolanaTransaction(input: {
  mnemonic: string
  accountIndex?: number
  rpcConfig: UtxoRpcConfig
  serializedTxBase64: string
}): Promise<{ signature: string }> {
  const signed = await signSolanaTransaction({
    mnemonic: input.mnemonic,
    accountIndex: input.accountIndex,
    serializedTxBase64: input.serializedTxBase64
  })
  const relayed = await sendBridgeSolanaSignedRelay(input.rpcConfig, {
    kind: 'coin',
    signedTxBase64: signed
  })
  return { signature: String(relayed.txid || '').trim() }
}

export async function signCosmosDirect(input: {
  mnemonic: string
  accountIndex?: number
  network: Network
  signDoc: {
    bodyBytes: string
    authInfoBytes: string
    chainId: string
    accountNumber: string
  }
}): Promise<{
  signed: {
    bodyBytes: string
    authInfoBytes: string
    chainId: string
    accountNumber: string
  }
  signature: {
    pub_key: { type: string; value: string }
    signature: string
  }
}> {
  const config = resolveCosmosAddressConfig(input.network)
  const derived = await deriveCosmosAddress(input.mnemonic, resolveAccountIndex(input.accountIndex), {
    hrp: config.hrp,
    coinType: config.coinType
  })
  const bodyBytes = fromBase64(input.signDoc.bodyBytes)
  const authInfoBytes = fromBase64(input.signDoc.authInfoBytes)
  const signDocBytes = encodeSignDoc({
    bodyBytes,
    authInfoBytes,
    chainId: String(input.signDoc.chainId || '').trim(),
    accountNumber: BigInt(String(input.signDoc.accountNumber || '0'))
  })
  const signatureBytes = secp.sign(sha256(signDocBytes), hexToBytes(derived.privHex), {
    prehash: false,
    lowS: true,
    format: 'compact'
  })
  return {
    signed: {
      bodyBytes: input.signDoc.bodyBytes,
      authInfoBytes: input.signDoc.authInfoBytes,
      chainId: String(input.signDoc.chainId || '').trim(),
      accountNumber: String(input.signDoc.accountNumber || '0')
    },
    signature: {
      pub_key: {
        type: 'tendermint/PubKeySecp256k1',
        value: toBase64(hexToBytes(derived.pubHex))
      },
      signature: toBase64(signatureBytes)
    }
  }
}

export async function deriveCosmosKeyData(input: {
  mnemonic: string
  accountIndex?: number
  network: Network
}): Promise<{
  address: string
  bech32Address: string
  pubKeyBase64: string
  algo: 'secp256k1'
}> {
  const config = resolveCosmosAddressConfig(input.network)
  const derived = await deriveCosmosAddress(input.mnemonic, resolveAccountIndex(input.accountIndex), {
    hrp: config.hrp,
    coinType: config.coinType
  })
  return {
    address: derived.address,
    bech32Address: derived.address,
    pubKeyBase64: toBase64(hexToBytes(derived.pubHex)),
    algo: 'secp256k1'
  }
}

export async function signCosmosAmino(input: {
  mnemonic: string
  accountIndex?: number
  network: Network
  signDoc: any
}): Promise<{
  signed: any
  signature: {
    pub_key: { type: string; value: string }
    signature: string
  }
}> {
  const config = resolveCosmosAddressConfig(input.network)
  const derived = await deriveCosmosAddress(input.mnemonic, resolveAccountIndex(input.accountIndex), {
    hrp: config.hrp,
    coinType: config.coinType
  })
  const canonical = stableAminoValue(input.signDoc)
  const digest = sha256(utf8(JSON.stringify(canonical)))
  const signatureBytes = secp.sign(digest, hexToBytes(derived.privHex), {
    prehash: false,
    lowS: true,
    format: 'compact'
  })
  return {
    signed: canonical,
    signature: {
      pub_key: {
        type: 'tendermint/PubKeySecp256k1',
        value: toBase64(hexToBytes(derived.pubHex))
      },
      signature: toBase64(signatureBytes)
    }
  }
}

export function buildCosmosTxBytesBase64(input: {
  signDoc: { bodyBytes: string; authInfoBytes: string }
  signatureBase64: string
}): string {
  const txRawBytes = encodeTxRaw({
    bodyBytes: fromBase64(input.signDoc.bodyBytes),
    authInfoBytes: fromBase64(input.signDoc.authInfoBytes),
    signature: fromBase64(input.signatureBase64)
  })
  return toBase64(txRawBytes)
}

export async function broadcastCosmosTx(input: {
  rpcUrl: string
  txBytesBase64: string
  mode?: 'BROADCAST_MODE_SYNC' | 'BROADCAST_MODE_ASYNC' | 'BROADCAST_MODE_BLOCK'
}): Promise<{ txhash: string; rawLog?: string }> {
  const mode = input.mode || 'BROADCAST_MODE_SYNC'
  let lastError: unknown = null
  for (const base of deriveCosmosRestCandidates(input.rpcUrl)) {
    try {
      const response = await fetch(`${base}/cosmos/tx/v1beta1/txs`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tx_bytes: input.txBytesBase64,
          mode
        })
      })
      const json = await response.json().catch(() => null)
      if (!response.ok || !json?.tx_response) {
        throw new Error(String(json?.message || json?.error || `Cosmos broadcast failed (HTTP ${response.status})`))
      }
      const txhash = String(json.tx_response.txhash || '').trim()
      if (!txhash) throw new Error('Cosmos broadcast returned no txhash')
      return {
        txhash,
        rawLog: typeof json.tx_response.raw_log === 'string' ? json.tx_response.raw_log : undefined
      }
    } catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Unable to broadcast Cosmos transaction')
}

export function toBase64String(value: Uint8Array): string {
  return toBase64(value)
}

export function fromBase64String(value: string): Uint8Array {
  return fromBase64(value)
}

export function hexBytesToBase64(hexValue: string): string {
  return toBase64(hexToBytes(String(hexValue || '').trim().replace(/^0x/i, '')))
}

export function bytesToHexString(bytes: Uint8Array): string {
  return bytesToHex(bytes)
}
