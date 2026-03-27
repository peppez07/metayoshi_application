import assert from 'node:assert/strict'
import test from 'node:test'

import { getPublicKey } from '@noble/secp256k1'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils'

import {
  addressToP2pkhScriptPubKeyHex,
  pubkeyToP2pkhAddress,
  redeemScriptToP2shAddress,
  redeemScriptToP2shScriptPubKeyHex
} from '../src/lib/utxoAddress'
import {
  assertRtmMultisigSigningInputsMatchRedeemScript,
  parseRtmP2shMultisig
} from '../src/lib/rtmMultisigCore'
import { signLegacyP2shMultisigTransaction } from '../src/lib/utxoSign'

function normalizeHex(value: string): string {
  return String(value || '').trim().toLowerCase().replace(/^0x/i, '')
}

function encodeVarInt(value: number): Uint8Array {
  if (!Number.isInteger(value) || value < 0 || value > 0xfc) {
    throw new Error(`Unsupported compact size value for test transaction: ${value}`)
  }
  return Uint8Array.of(value)
}

function u32le(value: number): Uint8Array {
  const out = new Uint8Array(4)
  const view = new DataView(out.buffer)
  view.setUint32(0, value >>> 0, true)
  return out
}

function u64le(value: bigint): Uint8Array {
  const out = new Uint8Array(8)
  const view = new DataView(out.buffer)
  view.setUint32(0, Number(value & 0xffffffffn), true)
  view.setUint32(4, Number((value >> 32n) & 0xffffffffn), true)
  return out
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

function reverseBytes(bytes: Uint8Array): Uint8Array {
  return Uint8Array.from([...bytes].reverse())
}

function buildRedeemScript(threshold: number, pubkeysHex: string[]): string {
  if (threshold < 1 || threshold > pubkeysHex.length || pubkeysHex.length > 16) {
    throw new Error('Invalid multisig threshold for test redeem script')
  }
  const thresholdOpcode = 0x50 + threshold
  const signerOpcode = 0x50 + pubkeysHex.length
  const parts: Uint8Array[] = [Uint8Array.of(thresholdOpcode)]
  for (const pubkeyHex of pubkeysHex) {
    const pubkey = hexToBytes(normalizeHex(pubkeyHex))
    parts.push(Uint8Array.of(pubkey.length), pubkey)
  }
  parts.push(Uint8Array.of(signerOpcode, 0xae))
  return bytesToHex(concatBytes(...parts))
}

function buildUnsignedLegacyTxHex(params: {
  txid: string
  vout: number
  outputScriptPubKeyHex: string
  outputValueSats: bigint
}): string {
  const txidLe = reverseBytes(hexToBytes(normalizeHex(params.txid)))
  const scriptPubKey = hexToBytes(normalizeHex(params.outputScriptPubKeyHex))
  return bytesToHex(concatBytes(
    u32le(1),
    encodeVarInt(1),
    txidLe,
    u32le(params.vout),
    Uint8Array.of(0x00),
    Uint8Array.of(0xff, 0xff, 0xff, 0xff),
    encodeVarInt(1),
    u64le(params.outputValueSats),
    encodeVarInt(scriptPubKey.length),
    scriptPubKey,
    u32le(0)
  ))
}

const PRIVATE_KEYS = [
  '0000000000000000000000000000000000000000000000000000000000000001',
  '0000000000000000000000000000000000000000000000000000000000000002',
  '0000000000000000000000000000000000000000000000000000000000000003'
]

const PUBKEYS = PRIVATE_KEYS.map((privHex) => bytesToHex(getPublicKey(hexToBytes(privHex), true)))
const REDEEM_SCRIPT_HEX = buildRedeemScript(2, PUBKEYS)
const RTM_MULTISIG_ADDRESS = redeemScriptToP2shAddress(REDEEM_SCRIPT_HEX, 'RTM')
const RTM_SCRIPT_PUBKEY_HEX = redeemScriptToP2shScriptPubKeyHex(REDEEM_SCRIPT_HEX)
const DESTINATION_ADDRESS = pubkeyToP2pkhAddress(getPublicKey(hexToBytes(PRIVATE_KEYS[2]), true), 0x3c)
const DESTINATION_SCRIPT_PUBKEY_HEX = addressToP2pkhScriptPubKeyHex(DESTINATION_ADDRESS, 'RTM')

test('RTM multisig import parsing derives threshold and script-hash address', () => {
  const parsed = parseRtmP2shMultisig(REDEEM_SCRIPT_HEX, RTM_MULTISIG_ADDRESS)

  assert.equal(parsed.address, RTM_MULTISIG_ADDRESS)
  assert.equal(parsed.threshold, 2)
  assert.equal(parsed.scriptType, 'p2sh')
  assert.deepEqual(parsed.signers.map((entry) => normalizeHex(entry.pubkey)), PUBKEYS.map(normalizeHex))
})

test('RTM multisig import parsing fails closed on address mismatch', () => {
  assert.throws(
    () => parseRtmP2shMultisig(REDEEM_SCRIPT_HEX, DESTINATION_ADDRESS),
    /does not match redeem script/
  )
})

test('RTM multisig signing finalizes a 2-of-3 legacy script-hash transaction', async () => {
  const unsignedHex = buildUnsignedLegacyTxHex({
    txid: '11'.repeat(32),
    vout: 0,
    outputScriptPubKeyHex: DESTINATION_SCRIPT_PUBKEY_HEX,
    outputValueSats: 125000000n
  })

  const signedHex = await signLegacyP2shMultisigTransaction(
    unsignedHex,
    [{
      txid: '11'.repeat(32),
      vout: 0,
      scriptPubKeyHex: RTM_SCRIPT_PUBKEY_HEX,
      amountSats: 150000000
    }],
    REDEEM_SCRIPT_HEX,
    [PRIVATE_KEYS[0], PRIVATE_KEYS[1]]
  )

  assert.notEqual(signedHex, unsignedHex)
  assert.ok(normalizeHex(signedHex).includes(normalizeHex(REDEEM_SCRIPT_HEX)))
})

test('RTM multisig signing rejects below-threshold signer sets', async () => {
  const unsignedHex = buildUnsignedLegacyTxHex({
    txid: '22'.repeat(32),
    vout: 1,
    outputScriptPubKeyHex: DESTINATION_SCRIPT_PUBKEY_HEX,
    outputValueSats: 50000000n
  })

  await assert.rejects(
    () => signLegacyP2shMultisigTransaction(
      unsignedHex,
      [{
        txid: '22'.repeat(32),
        vout: 1,
        scriptPubKeyHex: RTM_SCRIPT_PUBKEY_HEX,
        amountSats: 75000000
      }],
      REDEEM_SCRIPT_HEX,
      [PRIVATE_KEYS[0]]
    ),
    /Not enough linked local RTM signers/
  )
})

test('RTM multisig asset input validation rejects mixed script contexts', () => {
  assert.throws(
    () => assertRtmMultisigSigningInputsMatchRedeemScript(
      [
        {
          txid: '33'.repeat(32),
          vout: 0,
          scriptPubKeyHex: RTM_SCRIPT_PUBKEY_HEX,
          amountSats: 0
        },
        {
          txid: '44'.repeat(32),
          vout: 1,
          scriptPubKeyHex: DESTINATION_SCRIPT_PUBKEY_HEX,
          amountSats: 1000
        }
      ],
      REDEEM_SCRIPT_HEX
    ),
    /same imported multisig account/
  )
})
