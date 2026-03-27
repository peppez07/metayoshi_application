import { bytesToHex, hexToBytes } from '@noble/hashes/utils'

import { redeemScriptToP2shAddress, redeemScriptToP2shScriptPubKeyHex } from './utxoAddress'
import type { UnsignedTxInput } from './utxoSign'

export interface ParsedRtmP2shMultisig {
  address: string
  threshold: number
  scriptType: 'p2sh'
  redeemScriptHex: string
  signers: Array<{ pubkey: string }>
}

function normalizeHex(value: string): string {
  return String(value || '').trim().toLowerCase().replace(/^0x/i, '')
}

function parseSmallIntegerOpcode(opcode: number): number {
  if (opcode === 0x00) return 0
  if (opcode >= 0x51 && opcode <= 0x60) return opcode - 0x50
  throw new Error('Unsupported multisig small integer opcode')
}

function readPushData(script: Uint8Array, offset: number): { data: Uint8Array; nextOffset: number } {
  if (offset >= script.length) throw new Error('Unexpected end of redeem script')
  const pushLength = script[offset]
  if (pushLength < 1 || pushLength > 75) {
    throw new Error('Only direct push multisig redeem scripts are supported for RTM multisig v1')
  }
  const start = offset + 1
  const end = start + pushLength
  if (end > script.length) throw new Error('Unexpected end of redeem script push')
  return {
    data: script.slice(start, end),
    nextOffset: end
  }
}

export function parseRtmP2shMultisig(redeemScriptHex: string, address?: string): ParsedRtmP2shMultisig {
  const normalizedRedeemScriptHex = normalizeHex(redeemScriptHex)
  if (!normalizedRedeemScriptHex || normalizedRedeemScriptHex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(normalizedRedeemScriptHex)) {
    throw new Error('Redeem script must be valid hex')
  }
  const redeemScriptBytes = hexToBytes(normalizedRedeemScriptHex)
  if (redeemScriptBytes.length < 1 || redeemScriptBytes[redeemScriptBytes.length - 1] !== 0xae) {
    throw new Error('Redeem script must end with OP_CHECKMULTISIG')
  }

  const threshold = parseSmallIntegerOpcode(redeemScriptBytes[0])
  let offset = 1
  const pubkeys: string[] = []
  while (offset < redeemScriptBytes.length - 2) {
    const { data, nextOffset } = readPushData(redeemScriptBytes, offset)
    if (data.length !== 33 || (data[0] !== 0x02 && data[0] !== 0x03)) {
      throw new Error('Redeem script contains a non-compressed public key')
    }
    pubkeys.push(bytesToHex(data))
    offset = nextOffset
  }

  if (pubkeys.length === 0) throw new Error('Redeem script must contain at least one signer')
  const signerCount = parseSmallIntegerOpcode(redeemScriptBytes[offset])
  if (offset + 2 !== redeemScriptBytes.length) {
    throw new Error('Redeem script contains unsupported trailing data')
  }
  if (signerCount !== pubkeys.length) {
    throw new Error('Redeem script signer count does not match embedded public keys')
  }
  if (threshold < 1 || threshold > signerCount) {
    throw new Error('Redeem script threshold is invalid')
  }

  const resolvedAddress = redeemScriptToP2shAddress(normalizedRedeemScriptHex, 'RTM')
  const normalizedAddress = String(address || '').trim()
  if (normalizedAddress && normalizedAddress !== resolvedAddress) {
    throw new Error(`RTM multisig address does not match redeem script (${normalizedAddress} != ${resolvedAddress})`)
  }

  return {
    address: resolvedAddress,
    threshold,
    scriptType: 'p2sh',
    redeemScriptHex: normalizedRedeemScriptHex,
    signers: pubkeys.map((pubkey) => ({ pubkey }))
  }
}

export function assertRtmMultisigSigningInputsMatchRedeemScript(
  signingInputs: UnsignedTxInput[],
  redeemScriptHex: string,
  errorMessage = 'RTM multisig asset sends must use fee and asset inputs from the same imported multisig account'
): void {
  const expectedScriptPubKeyHex = redeemScriptToP2shScriptPubKeyHex(redeemScriptHex)
  if (!signingInputs.every((entry) => normalizeHex(entry.scriptPubKeyHex) === expectedScriptPubKeyHex)) {
    throw new Error(errorMessage)
  }
}
