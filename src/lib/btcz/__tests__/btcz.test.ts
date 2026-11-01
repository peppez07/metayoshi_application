import { describe, expect, test } from 'vitest'
import * as secp from '@noble/secp256k1'
import bs58 from 'bs58'
import vectors from './zip243-vectors.json'
import { BTCZ_NETWORK, RTM_NETWORK } from '../../networks'
import { addressToScript, decodeAddress, deriveAccountKey, derivationPath, isValidAddress, privateKeyToWif, pubkeyToAddress } from '../../rtm/address'
import { bytesToHex, concatBytes, hash160, hexToBytes, sha256d } from '../../rtm/bytes'
import { buildNativeSend } from '../../rtm/builder'
import { headerTime } from '../../rtm/history'
import {
  CANOPY_BRANCH_ID,
  consensusBranchId,
  estimateZcashTxBytes,
  parseZcashTx,
  SAPLING_BRANCH_ID,
  saplingSighash,
  serializeZcashTx,
  signZcashTransaction,
  TX_EXPIRY_DELTA,
  zcashTxid
} from '../transaction'
import { btczSendChain } from '../chain'

function derToCompact(der: Uint8Array): Uint8Array {
  expect(der[0]).toBe(0x30)
  const rLength = der[3]
  const r = der.slice(4, 4 + rLength)
  const s = der.slice(6 + rLength, 6 + rLength + der[5 + rLength])
  const pad = (n: Uint8Array) => { const out = new Uint8Array(32); out.set(n.slice(-32), 32 - Math.min(32, n.length)); return out }
  return concatBytes(pad(r), pad(s))
}

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

describe('ZIP-243 test vectors', () => {
  test.each(vectors.vectors.map((v, i) => [i, v] as const))('vector %i', (_i, vector) => {
    const [txHex, scriptCode, input, hashType, amount, branchId, expected] = vector as [string, string, number, number, number, number, string]
    const tx = parseZcashTx(txHex)
    expect(bytesToHex(serializeZcashTx(tx))).toBe(txHex)
    const digest = saplingSighash(tx, input, hexToBytes(scriptCode), BigInt(amount), hashType, branchId)
    expect(bytesToHex(digest)).toBe(expected)
  })
})

describe('BitcoinZ addresses', () => {
  test('derives t1 addresses on m/44\'/177\' that differ from the RTM address', async () => {
    const btcz = await deriveAccountKey(MNEMONIC, 0, BTCZ_NETWORK)
    const rtm = await deriveAccountKey(MNEMONIC, 0)
    expect(derivationPath(0, BTCZ_NETWORK)).toBe("m/44'/177'/0'/0/0")
    expect(btcz.address.startsWith('t1')).toBe(true)
    expect(btcz.address).toHaveLength(35)
    expect(rtm.address.startsWith('R')).toBe(true)
    expect(isValidAddress(btcz.address, BTCZ_NETWORK)).toBe(true)
    expect(isValidAddress(btcz.address, RTM_NETWORK)).toBe(false)
    expect(isValidAddress(rtm.address, BTCZ_NETWORK)).toBe(false)
    expect(decodeAddress(btcz.address, BTCZ_NETWORK)).toEqual({ kind: 'p2pkh', hash: hash160(btcz.pubkey) })
    expect(bytesToHex(addressToScript(btcz.address, BTCZ_NETWORK))).toBe(`76a914${bytesToHex(hash160(btcz.pubkey))}88ac`)
    expect(privateKeyToWif(btcz.privateKey, BTCZ_NETWORK)).toMatch(/^[KL]/)
  })

  test('P2SH addresses use the t3 prefix and pay to OP_HASH160 scripts', () => {
    const hash = new Uint8Array(20).fill(7)
    const payload = concatBytes(BTCZ_NETWORK.p2shPrefix, hash)
    const p2sh = bs58.encode(concatBytes(payload, sha256d(payload).slice(0, 4)))
    expect(p2sh.startsWith('t3')).toBe(true)
    expect(decodeAddress(p2sh, BTCZ_NETWORK)).toEqual({ kind: 'p2sh', hash })
    expect(bytesToHex(addressToScript(p2sh, BTCZ_NETWORK))).toBe(`a914${'07'.repeat(20)}87`)
    const p2pkh = pubkeyToAddress(secp.getPublicKey(new Uint8Array(32).fill(1), true), BTCZ_NETWORK)
    expect(p2pkh.startsWith('t1')).toBe(true)
    // A corrupted checksum is rejected.
    expect(decodeAddress(p2pkh.slice(0, -1) + (p2pkh.endsWith('1') ? '2' : '1'), BTCZ_NETWORK)).toBeNull()
  })

  test('reads nTime from an Equihash header at byte 100', () => {
    const header = new Uint8Array(140)
    header.set([0x78, 0x56, 0x34, 0x12], 100)
    expect(headerTime(bytesToHex(header), BTCZ_NETWORK.headerTimeOffset)).toBe(0x12345678 * 1000)
  })
})

describe('BitcoinZ signing', () => {
  test('uses the Canopy branch after activation', () => {
    expect(consensusBranchId(1_734_998)).toBe(SAPLING_BRANCH_ID)
    expect(consensusBranchId(1_734_999)).toBe(CANOPY_BRANCH_ID)
    expect(consensusBranchId(2_000_000)).toBe(CANOPY_BRANCH_ID)
  })

  test('signs a transparent Sapling v4 transaction with valid ZIP-243 signatures', async () => {
    const key = await deriveAccountKey(MNEMONIC, 0, BTCZ_NETWORK)
    const script = addressToScript(key.address, BTCZ_NETWORK)
    const recipient = addressToScript((await deriveAccountKey(MNEMONIC, 1, BTCZ_NETWORK)).address, BTCZ_NETWORK)
    const spends = [
      { txid: '11'.repeat(32), vout: 0, prevScript: script, value: 150_000_000n },
      { txid: '22'.repeat(32), vout: 3, prevScript: script, value: 70_000_000n }
    ]
    const outputs = [{ value: 200_000_000n, script: recipient }, { value: 19_990_000n, script }]
    const tip = 1_900_000
    const signed = signZcashTransaction(outputs, spends, key.privateKey, { tipHeight: tip })
    const tx = parseZcashTx(signed.hex)

    expect(signed.hex.startsWith('0400008085202f89')).toBe(true)
    expect(tx.expiryHeight).toBe(tip + TX_EXPIRY_DELTA)
    expect(tx.locktime).toBe(0)
    expect(tx.valueBalance).toBe(0n)
    expect(zcashTxid(tx)).toBe(signed.txid)
    expect(signed.size).toBe(signed.hex.length / 2)
    expect(signed.size).toBeLessThanOrEqual(estimateZcashTxBytes(2, [recipient, script]))

    tx.inputs.forEach((input, index) => {
      const sigLength = input.scriptSig[0]
      const signature = derToCompact(input.scriptSig.slice(1, sigLength))
      expect(input.scriptSig[sigLength]).toBe(0x01)
      expect(bytesToHex(input.scriptSig.slice(sigLength + 2))).toBe(bytesToHex(key.pubkey))
      const digest = saplingSighash(tx, index, spends[index].prevScript, spends[index].value, 1, CANOPY_BRANCH_ID)
      expect(secp.verify(signature, digest, key.pubkey, { prehash: false })).toBe(true)
      // Signing under the pre-Canopy branch must not verify.
      const sapling = saplingSighash(tx, index, spends[index].prevScript, spends[index].value, 1, SAPLING_BRANCH_ID)
      expect(secp.verify(signature, sapling, key.pubkey, { prehash: false })).toBe(false)
    })
  })

  test('refuses inputs that the key does not own', async () => {
    const key = await deriveAccountKey(MNEMONIC, 0, BTCZ_NETWORK)
    const other = addressToScript((await deriveAccountKey(MNEMONIC, 1, BTCZ_NETWORK)).address, BTCZ_NETWORK)
    expect(() => signZcashTransaction([{ value: 1000n, script: other }], [{ txid: '11'.repeat(32), vout: 0, prevScript: other, value: 5000n }],
      key.privateKey, { tipHeight: 1_900_000 })).toThrow(/not owned/)
  })

  test('builds a native BTCZ send with change and the minimum fee', async () => {
    const key = await deriveAccountKey(MNEMONIC, 0, BTCZ_NETWORK)
    const to = (await deriveAccountKey(MNEMONIC, 1, BTCZ_NETWORK)).address
    const chain = btczSendChain(1_900_000)
    const built = buildNativeSend({
      senderAddress: key.address,
      privateKey: key.privateKey,
      coins: [{ txid: 'aa'.repeat(32), vout: 1, value: 500_000_000n, height: 1_899_000 }],
      outputs: [{ address: to, value: 100_000_000n }],
      feePerByte: 1n,
      chain
    })
    const tx = parseZcashTx(built.hex)
    expect(built.fee).toBe(chain.minFee)
    expect(built.sent).toBe(100_000_000n)
    expect(tx.outputs.map((o) => o.value)).toEqual([100_000_000n, 500_000_000n - 100_000_000n - chain.minFee])
    expect(bytesToHex(tx.outputs[1].script)).toBe(bytesToHex(addressToScript(key.address, BTCZ_NETWORK)))
  })

  test('rejects RTM recipients on BitcoinZ and reports BTCZ amounts', async () => {
    const key = await deriveAccountKey(MNEMONIC, 0, BTCZ_NETWORK)
    const rtm = await deriveAccountKey(MNEMONIC, 0)
    const params = {
      senderAddress: key.address,
      privateKey: key.privateKey,
      coins: [{ txid: 'aa'.repeat(32), vout: 1, value: 50_000n, height: 1 }],
      feePerByte: 1n,
      chain: btczSendChain(1_900_000)
    }
    expect(() => buildNativeSend({ ...params, outputs: [{ address: rtm.address, value: 10_000n }] })).toThrow(/Invalid BTCZ address/)
    expect(() => buildNativeSend({ ...params, outputs: [{ address: key.address, value: 10_000_000n }] })).toThrow(/Insufficient confirmed BTCZ/)
  })
})
