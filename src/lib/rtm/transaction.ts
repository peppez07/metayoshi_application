/**
 * Plain (type 0) Raptoreum transactions. Native and asset transfers are both
 * type 0; asset quantities live inside zero-value asset output scripts.
 * Signing uses the legacy SIGHASH_ALL digest; the prevout script is the full
 * output script being spent (including any asset suffix).
 */
import * as secp from '@noble/secp256k1'
import { sha256 } from '@noble/hashes/sha256'
import { hmac } from '@noble/hashes/hmac'
import {
  ByteReader,
  bytesToHex,
  compactSize,
  concatBytes,
  equalBytes,
  hash160,
  hexToBytes,
  pushData,
  reverseBytes,
  sha256d,
  u32LE,
  u64LE,
  varBytes
} from './bytes'

if (!secp.hashes.sha256) secp.hashes.sha256 = (msg: Uint8Array) => sha256(msg)
if (!secp.hashes.hmacSha256) {
  secp.hashes.hmacSha256 = (key: Uint8Array, msg: Uint8Array) => hmac(sha256, key, msg)
}

export const TX_VERSION = 2
export const SEQUENCE_FINAL = 0xffffffff
export const SIGHASH_ALL = 0x01

export interface TxInput {
  txid: string
  vout: number
  scriptSig: Uint8Array
  sequence: number
}

export interface TxOutput {
  value: bigint
  script: Uint8Array
}

export interface Transaction {
  version: number
  inputs: TxInput[]
  outputs: TxOutput[]
  locktime: number
}

/** Input to be signed: the outpoint plus the script of the output it spends. */
export interface SpendInput {
  txid: string
  vout: number
  prevScript: Uint8Array
  value: bigint
}

export function serializeTx(tx: Transaction): Uint8Array {
  return concatBytes(
    u32LE(tx.version),
    compactSize(tx.inputs.length),
    ...tx.inputs.map((input) => concatBytes(
      reverseBytes(hexToBytes(input.txid)),
      u32LE(input.vout),
      varBytes(input.scriptSig),
      u32LE(input.sequence)
    )),
    compactSize(tx.outputs.length),
    ...tx.outputs.map((output) => concatBytes(u64LE(output.value), varBytes(output.script))),
    u32LE(tx.locktime)
  )
}

export function parseTx(hex: string): Transaction {
  const reader = new ByteReader(hexToBytes(hex))
  const tx = readTx(reader)
  if (reader.remaining !== 0) throw new Error('Trailing transaction bytes')
  return tx
}

/** Reads one transaction; special-transaction payloads are skipped. */
export function readTx(reader: ByteReader): Transaction {
  const header = reader.u32()
  const version = header & 0xffff
  const txType = header >>> 16
  const inputs: TxInput[] = []
  for (let i = reader.compactSize(); i > 0; i -= 1) {
    const txid = bytesToHex(reverseBytes(reader.take(32)))
    const vout = reader.u32()
    const scriptSig = reader.varBytes()
    inputs.push({ txid, vout, scriptSig, sequence: reader.u32() })
  }
  const outputs: TxOutput[] = []
  for (let i = reader.compactSize(); i > 0; i -= 1) {
    const value = reader.u64()
    outputs.push({ value, script: reader.varBytes() })
  }
  const locktime = reader.u32()
  if (version === 3 && txType) reader.varBytes()
  return { version: header, inputs, outputs, locktime }
}

export function txid(tx: Transaction): string {
  return bytesToHex(reverseBytes(sha256d(serializeTx(tx))))
}

export function legacySighash(tx: Transaction, index: number, prevScript: Uint8Array): Uint8Array {
  const copy: Transaction = {
    ...tx,
    inputs: tx.inputs.map((input, i) => ({ ...input, scriptSig: i === index ? prevScript : new Uint8Array() }))
  }
  return sha256d(concatBytes(serializeTx(copy), u32LE(SIGHASH_ALL)))
}

function derInteger(value: Uint8Array): Uint8Array {
  let start = 0
  while (start < value.length - 1 && value[start] === 0) start += 1
  let body = value.slice(start)
  if (body[0] & 0x80) body = concatBytes(Uint8Array.of(0), body)
  return concatBytes(Uint8Array.of(0x02, body.length), body)
}

function compactToDer(signature: Uint8Array): Uint8Array {
  const r = derInteger(signature.slice(0, 32))
  const s = derInteger(signature.slice(32, 64))
  return concatBytes(Uint8Array.of(0x30, r.length + s.length), r, s)
}

/** The P2PKH key hash a script pays to, including asset-carrying P2PKH scripts. */
export function p2pkhKeyHash(script: Uint8Array): Uint8Array | null {
  if (script.length < 25 || script[0] !== 0x76 || script[1] !== 0xa9 || script[2] !== 0x14) return null
  if (script[23] !== 0x88 || script[24] !== 0xac) return null
  if (script.length > 25 && script[25] !== 0xbc) return null
  return script.slice(3, 23)
}

export function signTransaction(
  outputs: TxOutput[],
  spends: SpendInput[],
  privateKey: Uint8Array
): { hex: string; txid: string; size: number } {
  if (spends.length === 0) throw new Error('Transaction has no inputs')
  const pubkey = secp.getPublicKey(privateKey, true)
  const keyHash = hash160(pubkey)
  for (const spend of spends) {
    const owner = p2pkhKeyHash(spend.prevScript)
    if (!owner || !equalBytes(owner, keyHash)) {
      throw new Error(`Input ${spend.txid}:${spend.vout} is not owned by the signing key`)
    }
  }
  const tx: Transaction = {
    version: TX_VERSION,
    inputs: spends.map((spend) => ({ txid: spend.txid, vout: spend.vout, scriptSig: new Uint8Array(), sequence: SEQUENCE_FINAL })),
    outputs,
    locktime: 0
  }
  tx.inputs = tx.inputs.map((input, index) => {
    const digest = legacySighash(tx, index, spends[index].prevScript)
    const signature = secp.sign(digest, privateKey, { prehash: false, lowS: true, format: 'compact' })
    const sigWithType = concatBytes(compactToDer(signature), Uint8Array.of(SIGHASH_ALL))
    return { ...input, scriptSig: concatBytes(pushData(sigWithType), pushData(pubkey)) }
  })
  const raw = serializeTx(tx)
  return { hex: bytesToHex(raw), txid: txid(tx), size: raw.length }
}

/** Upper-bound size of a signed P2PKH input (73-byte DER signature, compressed key). */
export const P2PKH_INPUT_BYTES = 32 + 4 + 1 + (1 + 73) + (1 + 33) + 4

export function estimateTxBytes(inputCount: number, outputScripts: Uint8Array[]): number {
  const outputs = outputScripts.reduce((n, script) => n + 8 + compactSize(script.length).length + script.length, 0)
  return 4 + compactSize(inputCount).length + inputCount * P2PKH_INPUT_BYTES
    + compactSize(outputScripts.length).length + outputs + 4
}
