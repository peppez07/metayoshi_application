/**
 * BitcoinZ transactions (Zcash format). The wallet creates transparent-only
 * Sapling v4 transactions (overwintered, version group 0x892F2085) and signs
 * them with the ZIP-243 digest under the Canopy consensus branch ID, as in
 * btcz/bitcoinz src/script/interpreter.cpp SignatureHash().
 *
 * The parser reads every transaction version (v1–v4, including shielded
 * parts) so history containing shielding transactions can be read.
 */
import * as secp from '@noble/secp256k1'
import { blake2b } from '@noble/hashes/blake2b'
import {
  ByteReader,
  bytesToHex,
  compactSize,
  concatBytes,
  equalBytes,
  hash160,
  hexToBytes,
  i64LE,
  pushData,
  reverseBytes,
  sha256d,
  u32LE,
  u64LE,
  utf8,
  varBytes
} from '../rtm/bytes'
import {
  compactToDer,
  estimateTxBytes as estimateLegacyTxBytes,
  p2pkhKeyHash,
  SEQUENCE_FINAL,
  SIGHASH_ALL,
  type SpendInput,
  type Transaction,
  type TxInput,
  type TxOutput
} from '../rtm/transaction'

export const OVERWINTER_VERSION_GROUP_ID = 0x03c48270
export const SAPLING_VERSION_GROUP_ID = 0x892f2085
export const SAPLING_TX_VERSION = 4

/** consensus/upgrades.cpp; BitcoinZ has no Blossom, Heartwood or NU5. */
export const SAPLING_BRANCH_ID = 0x76b809bb
export const CANOPY_BRANCH_ID = 0xe9ff75a6
export const CANOPY_ACTIVATION_HEIGHT = 1_735_000
/** main.h DEFAULT_TX_EXPIRY_DELTA. */
export const TX_EXPIRY_DELTA = 20

const SIGHASH_NONE = 0x02
const SIGHASH_SINGLE = 0x03
const SIGHASH_ANYONECANPAY = 0x80
const SPEND_DESCRIPTION_BYTES = 384
/** cv, anchor, nullifier, rk and zkproof; spendAuthSig is not hashed. */
const SPEND_DESCRIPTION_HASHED_BYTES = 320
const OUTPUT_DESCRIPTION_BYTES = 948
const NOT_AN_INPUT = -1

export interface ZcashTransaction extends Transaction {
  overwintered: boolean
  /** Version without the overwintered bit. */
  txVersion: number
  versionGroupId: number
  expiryHeight: number
  valueBalance: bigint
  shieldedSpends: Uint8Array[]
  shieldedOutputs: Uint8Array[]
  joinSplits: Uint8Array[]
  joinSplitPubKey: Uint8Array
  joinSplitSig: Uint8Array
  bindingSig: Uint8Array
}

/** The branch a transaction mined in the block after `tipHeight` must commit to. */
export function consensusBranchId(tipHeight: number): number {
  return tipHeight + 1 >= CANOPY_ACTIVATION_HEIGHT ? CANOPY_BRANCH_ID : SAPLING_BRANCH_ID
}

function txHeader(tx: ZcashTransaction): number {
  return ((tx.txVersion & 0x7fffffff) | (tx.overwintered ? 0x80000000 : 0)) >>> 0
}

function serializeInputs(inputs: TxInput[]): Uint8Array {
  return concatBytes(
    compactSize(inputs.length),
    ...inputs.map((input) => concatBytes(outpoint(input), varBytes(input.scriptSig), u32LE(input.sequence)))
  )
}

function serializeOutput(output: TxOutput): Uint8Array {
  return concatBytes(u64LE(output.value), varBytes(output.script))
}

function outpoint(input: Pick<TxInput, 'txid' | 'vout'>): Uint8Array {
  return concatBytes(reverseBytes(hexToBytes(input.txid)), u32LE(input.vout))
}

export function serializeZcashTx(tx: ZcashTransaction): Uint8Array {
  const parts: Uint8Array[] = [u32LE(txHeader(tx))]
  if (tx.overwintered) parts.push(u32LE(tx.versionGroupId))
  parts.push(serializeInputs(tx.inputs), compactSize(tx.outputs.length), ...tx.outputs.map(serializeOutput), u32LE(tx.locktime))
  const sapling = tx.overwintered && tx.txVersion >= SAPLING_TX_VERSION
  if (tx.overwintered && tx.txVersion >= 3) parts.push(u32LE(tx.expiryHeight))
  if (sapling) {
    parts.push(i64LE(tx.valueBalance), compactSize(tx.shieldedSpends.length), ...tx.shieldedSpends,
      compactSize(tx.shieldedOutputs.length), ...tx.shieldedOutputs)
  }
  if (tx.txVersion >= 2) {
    parts.push(compactSize(tx.joinSplits.length), ...tx.joinSplits)
    if (tx.joinSplits.length > 0) parts.push(tx.joinSplitPubKey, tx.joinSplitSig)
  }
  if (sapling && tx.shieldedSpends.length + tx.shieldedOutputs.length > 0) parts.push(tx.bindingSig)
  return concatBytes(...parts)
}

function readList(reader: ByteReader, itemBytes: number): Uint8Array[] {
  const items: Uint8Array[] = []
  for (let i = reader.compactSize(); i > 0; i -= 1) items.push(reader.take(itemBytes))
  return items
}

export function readZcashTx(reader: ByteReader): ZcashTransaction {
  const header = reader.u32()
  const overwintered = (header & 0x80000000) !== 0
  const txVersion = header & 0x7fffffff
  if (overwintered && txVersion > SAPLING_TX_VERSION) throw new Error(`Unsupported BitcoinZ transaction version ${txVersion}`)
  const versionGroupId = overwintered ? reader.u32() : 0
  if (overwintered && txVersion === 3 && versionGroupId !== OVERWINTER_VERSION_GROUP_ID) throw new Error('Unknown version group')
  if (overwintered && txVersion === 4 && versionGroupId !== SAPLING_VERSION_GROUP_ID) throw new Error('Unknown version group')
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
  const sapling = overwintered && txVersion >= SAPLING_TX_VERSION
  const expiryHeight = overwintered && txVersion >= 3 ? reader.u32() : 0
  let valueBalance = 0n
  let shieldedSpends: Uint8Array[] = []
  let shieldedOutputs: Uint8Array[] = []
  if (sapling) {
    valueBalance = reader.i64()
    shieldedSpends = readList(reader, SPEND_DESCRIPTION_BYTES)
    shieldedOutputs = readList(reader, OUTPUT_DESCRIPTION_BYTES)
  }
  let joinSplits: Uint8Array[] = []
  let joinSplitPubKey: Uint8Array = new Uint8Array()
  let joinSplitSig: Uint8Array = new Uint8Array()
  if (txVersion >= 2) {
    // Groth16 proofs from Sapling on; PHGR13 proofs before.
    joinSplits = readList(reader, sapling ? 1698 : 1802)
    if (joinSplits.length > 0) {
      joinSplitPubKey = reader.take(32)
      joinSplitSig = reader.take(64)
    }
  }
  const bindingSig = sapling && shieldedSpends.length + shieldedOutputs.length > 0 ? reader.take(64) : new Uint8Array()
  return {
    version: header,
    inputs,
    outputs,
    locktime,
    overwintered,
    txVersion,
    versionGroupId,
    expiryHeight,
    valueBalance,
    shieldedSpends,
    shieldedOutputs,
    joinSplits,
    joinSplitPubKey,
    joinSplitSig,
    bindingSig
  }
}

export function parseZcashTx(hex: string): ZcashTransaction {
  const reader = new ByteReader(hexToBytes(hex))
  const tx = readZcashTx(reader)
  if (reader.remaining !== 0) throw new Error('Trailing transaction bytes')
  return tx
}

export function zcashTxid(tx: ZcashTransaction): string {
  return bytesToHex(reverseBytes(sha256d(serializeZcashTx(tx))))
}

function personal(text: string): Uint8Array {
  const bytes = utf8(text)
  if (bytes.length !== 16) throw new Error('BLAKE2b personalization must be 16 bytes')
  return bytes
}

function blake(personalization: Uint8Array, ...parts: Uint8Array[]): Uint8Array {
  return blake2b(concatBytes(...parts), { dkLen: 32, personalization })
}

const ZERO_HASH = new Uint8Array(32)

/**
 * ZIP-243 signature digest. `inputIndex` -1 is the digest for a transaction
 * without a transparent input being signed (joinSplitSig / binding).
 */
export function saplingSighash(
  tx: ZcashTransaction,
  inputIndex: number,
  scriptCode: Uint8Array,
  amount: bigint,
  hashType: number,
  branchId: number
): Uint8Array {
  if (!tx.overwintered || tx.txVersion !== SAPLING_TX_VERSION || tx.versionGroupId !== SAPLING_VERSION_GROUP_ID) {
    throw new Error('Only Sapling v4 transactions are signed')
  }
  if (inputIndex !== NOT_AN_INPUT && (inputIndex < 0 || inputIndex >= tx.inputs.length)) throw new Error('Input index out of range')
  const base = hashType & 0x1f
  const anyoneCanPay = (hashType & SIGHASH_ANYONECANPAY) !== 0
  const hashPrevouts = anyoneCanPay ? ZERO_HASH : blake(personal('ZcashPrevoutHash'), ...tx.inputs.map(outpoint))
  const hashSequence = anyoneCanPay || base === SIGHASH_SINGLE || base === SIGHASH_NONE
    ? ZERO_HASH
    : blake(personal('ZcashSequencHash'), ...tx.inputs.map((input) => u32LE(input.sequence)))
  let hashOutputs = ZERO_HASH
  if (base !== SIGHASH_SINGLE && base !== SIGHASH_NONE) {
    hashOutputs = blake(personal('ZcashOutputsHash'), ...tx.outputs.map(serializeOutput))
  } else if (base === SIGHASH_SINGLE && inputIndex !== NOT_AN_INPUT && inputIndex < tx.outputs.length) {
    hashOutputs = blake(personal('ZcashOutputsHash'), serializeOutput(tx.outputs[inputIndex]))
  }
  const hashJoinSplits = tx.joinSplits.length > 0
    ? blake(personal('ZcashJSplitsHash'), ...tx.joinSplits, tx.joinSplitPubKey)
    : ZERO_HASH
  const hashShieldedSpends = tx.shieldedSpends.length > 0
    ? blake(personal('ZcashSSpendsHash'), ...tx.shieldedSpends.map((s) => s.slice(0, SPEND_DESCRIPTION_HASHED_BYTES)))
    : ZERO_HASH
  const hashShieldedOutputs = tx.shieldedOutputs.length > 0
    ? blake(personal('ZcashSOutputHash'), ...tx.shieldedOutputs)
    : ZERO_HASH

  const parts = [
    u32LE(txHeader(tx)),
    u32LE(tx.versionGroupId),
    hashPrevouts,
    hashSequence,
    hashOutputs,
    hashJoinSplits,
    hashShieldedSpends,
    hashShieldedOutputs,
    u32LE(tx.locktime),
    u32LE(tx.expiryHeight),
    i64LE(tx.valueBalance),
    u32LE(hashType >>> 0)
  ]
  if (inputIndex !== NOT_AN_INPUT) {
    const input = tx.inputs[inputIndex]
    parts.push(outpoint(input), varBytes(scriptCode), u64LE(amount), u32LE(input.sequence))
  }
  return blake(concatBytes(utf8('ZcashSigHash'), u32LE(branchId >>> 0)), ...parts)
}

export interface ZcashSignOptions {
  /** Current chain tip; sets the expiry height and the consensus branch. */
  tipHeight: number
}

export function signZcashTransaction(
  outputs: TxOutput[],
  spends: SpendInput[],
  privateKey: Uint8Array,
  options: ZcashSignOptions
): { hex: string; txid: string; size: number } {
  if (spends.length === 0) throw new Error('Transaction has no inputs')
  if (!Number.isSafeInteger(options.tipHeight) || options.tipHeight <= 0) throw new Error('Unknown BitcoinZ chain height')
  const pubkey = secp.getPublicKey(privateKey, true)
  const keyHash = hash160(pubkey)
  for (const spend of spends) {
    const owner = p2pkhKeyHash(spend.prevScript)
    if (!owner || spend.prevScript.length !== 25 || !equalBytes(owner, keyHash)) {
      throw new Error(`Input ${spend.txid}:${spend.vout} is not owned by the signing key`)
    }
  }
  const branchId = consensusBranchId(options.tipHeight)
  const tx: ZcashTransaction = {
    version: (SAPLING_TX_VERSION | 0x80000000) >>> 0,
    overwintered: true,
    txVersion: SAPLING_TX_VERSION,
    versionGroupId: SAPLING_VERSION_GROUP_ID,
    inputs: spends.map((spend) => ({ txid: spend.txid, vout: spend.vout, scriptSig: new Uint8Array(), sequence: SEQUENCE_FINAL })),
    outputs,
    locktime: 0,
    expiryHeight: options.tipHeight + TX_EXPIRY_DELTA,
    valueBalance: 0n,
    shieldedSpends: [],
    shieldedOutputs: [],
    joinSplits: [],
    joinSplitPubKey: new Uint8Array(),
    joinSplitSig: new Uint8Array(),
    bindingSig: new Uint8Array()
  }
  // Every input commits to all prevouts and outputs, not to other scriptSigs,
  // so the digests can be computed before any input is signed.
  tx.inputs = tx.inputs.map((input, index) => {
    const digest = saplingSighash(tx, index, spends[index].prevScript, spends[index].value, SIGHASH_ALL, branchId)
    const signature = secp.sign(digest, privateKey, { prehash: false, lowS: true, format: 'compact' })
    const sigWithType = concatBytes(compactToDer(signature), Uint8Array.of(SIGHASH_ALL))
    return { ...input, scriptSig: concatBytes(pushData(sigWithType), pushData(pubkey)) }
  })
  const raw = serializeZcashTx(tx)
  return { hex: bytesToHex(raw), txid: zcashTxid(tx), size: raw.length }
}

/** Upper bound for a transparent v4 transaction: legacy layout plus group ID, expiry, value balance and three empty lists. */
export function estimateZcashTxBytes(inputCount: number, outputScripts: Uint8Array[]): number {
  return estimateLegacyTxBytes(inputCount, outputScripts) + 4 + 4 + 8 + 3
}
