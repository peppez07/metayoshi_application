import { describe, expect, test } from 'vitest'
import * as secp from '@noble/secp256k1'
import bs58 from 'bs58'
import block20000 from './fixtures/raptoreum_mainnet_20000.json'
import {
  addressToScript,
  addressToScriptHash,
  decodeAddress,
  deriveAccountKey,
  isValidAddress,
  pubkeyToAddress
} from '../address'
import { formatUnits, parseUnits, toAtoms } from '../amount'
import { buildAssetTransferScript, parseAssetScript } from '../assetScript'
import { buildAssetSend, buildNativeSend, type AssetUtxo, type CoinUtxo } from '../builder'
import { ByteReader, bytesToHex, concatBytes, hash160, hexToBytes, reverseBytes, sha256d } from '../bytes'
import { legacySighash, parseTx, readTx, serializeTx, type Transaction } from '../transaction'

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const ASSET = '12'.repeat(32)
const P2PKH_11 = hexToBytes('76a914' + '11'.repeat(20) + '88ac')

function verifyDer(der: Uint8Array, digest: Uint8Array, pubkey: Uint8Array, lowS: boolean): boolean {
  const r = new ByteReader(der)
  if (r.u8() !== 0x30 || r.u8() !== der.length - 2) return false
  const int = () => {
    if (r.u8() !== 0x02) throw new Error('bad DER')
    const bytes = r.take(r.u8())
    const trimmed = bytes[0] === 0 ? bytes.slice(1) : bytes
    const out = new Uint8Array(32)
    out.set(trimmed, 32 - trimmed.length)
    return out
  }
  const compact = concatBytes(int(), int())
  return secp.verify(compact, digest, pubkey, { prehash: false, lowS })
}

describe('addresses', () => {
  // Produced by the MetaYoshi 0.1.0 derivation code; existing wallets must keep these.
  test.each([
    [0, 'RDjNvZL1TJQ7R8L23jDutdEioQG4eTC38V'],
    [1, 'RGqBLjnyqS29NL9YHt37uEQ15oUCt9gFsP'],
    [7, 'RVmt8fXtutJ6YGpyj7kS77M9376GSQU5wj']
  ])('account %i derives the 0.1.0 address', async (index, expected) => {
    const key = await deriveAccountKey(MNEMONIC, index)
    expect(key.address).toBe(expected)
    expect(pubkeyToAddress(key.pubkey)).toBe(expected)
  })

  test('validates RTM addresses only', () => {
    expect(isValidAddress('RDjNvZL1TJQ7R8L23jDutdEioQG4eTC38V')).toBe(true)
    expect(isValidAddress('RDjNvZL1TJQ7R8L23jDutdEioQG4eTC38W')).toBe(false)
    expect(isValidAddress('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2')).toBe(false)
    expect(isValidAddress('')).toBe(false)
  })

  test('script hash is reversed sha256 of the P2PKH script', () => {
    const address = 'RDjNvZL1TJQ7R8L23jDutdEioQG4eTC38V'
    const script = addressToScript(address)
    expect(bytesToHex(script.slice(3, 23))).toBe(bytesToHex(decodeAddress(address)!.hash))
    expect(addressToScriptHash(address)).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('amounts', () => {
  test('parses and formats without floats', () => {
    expect(parseUnits('0.1', 8)).toBe(10_000_000n)
    expect(parseUnits('20999999999.99999999', 8)).toBe(2_099_999_999_999_999_999n)
    expect(formatUnits(10_000_000n, 8)).toBe('0.1')
    expect(formatUnits(500n, 0)).toBe('500')
    expect(() => parseUnits('1.123', 2)).toThrow()
    expect(() => parseUnits('-1', 8)).toThrow()
    expect(() => parseUnits('1e5', 8)).toThrow()
    expect(toAtoms('123')).toBe(123n)
  })
})

describe('asset scripts', () => {
  // Expected hex produced by the ElectrumX test helper and accepted as canonical by
  // electrumx/lib/raptoreum_assets.parse_asset_script.
  const SERVER_VECTORS = [
    {
      amount: 123000000n,
      uniqueId: null,
      hex: '76a914111111111111111111111111111111111111111188acbc4c4d72746d40' + '3132'.repeat(32) + '00c0d454070000000075'
    },
    {
      amount: 500000000n,
      uniqueId: 7n,
      hex: '76a914111111111111111111111111111111111111111188acbc4c5572746d40' + '3132'.repeat(32) + '01070000000000000000' + '65cd1d0000000075'
    },
    {
      amount: 1n,
      uniqueId: null,
      hex: '76a914111111111111111111111111111111111111111188acbc4c4d72746d40' + '3132'.repeat(32) + '00010000000000000075'
    }
  ]

  test.each(SERVER_VECTORS)('builds the server-canonical script for $amount', ({ amount, uniqueId, hex }) => {
    const script = buildAssetTransferScript(P2PKH_11, { assetId: ASSET, amount, uniqueId })
    expect(bytesToHex(script)).toBe(hex)
    const parsed = parseAssetScript(script)!
    expect(parsed.canonical).toBe(true)
    expect(parsed.amount).toBe(amount)
    expect(parsed.uniqueId).toBe(uniqueId)
    expect(bytesToHex(parsed.recipientScript)).toBe(bytesToHex(P2PKH_11))
  })

  test('rejects invalid transfers', () => {
    expect(() => buildAssetTransferScript(P2PKH_11, { assetId: 'ROOT', amount: 1n, uniqueId: null })).toThrow()
    expect(() => buildAssetTransferScript(P2PKH_11, { assetId: ASSET, amount: 0n, uniqueId: null })).toThrow()
    expect(() => buildAssetTransferScript(P2PKH_11, { assetId: ASSET, amount: 150_000_000n, uniqueId: 1n })).toThrow()
    const p2sh = hexToBytes('a914' + '11'.repeat(20) + '87')
    expect(() => buildAssetTransferScript(p2sh, { assetId: ASSET, amount: 1n, uniqueId: null })).toThrow()
  })

  test('ignores native scripts', () => {
    expect(parseAssetScript(P2PKH_11)).toBeNull()
  })
})

describe('mainnet transactions (block 20000)', () => {
  const raw = hexToBytes(block20000.block)
  const reader = new ByteReader(raw)
  reader.take(80)
  const txs: Array<{ tx: Transaction; bytes: Uint8Array }> = []
  for (let n = reader.compactSize(); n > 0; n -= 1) {
    const start = reader.cursor
    const tx = readTx(reader)
    txs.push({ tx, bytes: raw.slice(start, reader.cursor) })
  }

  test('reads every transaction with the expected txids', () => {
    expect(reader.remaining).toBe(0)
    expect(txs.map(({ bytes }) => bytesToHex(reverseBytes(sha256d(bytes))))).toEqual(block20000.tx)
  })

  test('re-serializes plain transactions byte for byte', () => {
    const plain = txs.filter(({ tx }) => tx.version >>> 16 === 0)
    expect(plain.length).toBeGreaterThan(0)
    for (const { tx, bytes } of plain) {
      expect(bytesToHex(serializeTx(tx))).toBe(bytesToHex(bytes))
      expect(bytesToHex(serializeTx(parseTx(bytesToHex(bytes))))).toBe(bytesToHex(bytes))
    }
  })

  test('legacy sighash verifies real P2PKH signatures', () => {
    let verified = 0
    for (const { tx } of txs.filter(({ tx }) => tx.version >>> 16 === 0)) {
      tx.inputs.forEach((input, index) => {
        const sr = new ByteReader(input.scriptSig)
        const sig = sr.take(sr.u8())
        const pubkey = sr.take(sr.u8())
        const prevScript = concatBytes(Uint8Array.of(0x76, 0xa9, 0x14), hash160(pubkey), Uint8Array.of(0x88, 0xac))
        const digest = legacySighash(tx, index, prevScript)
        const der = sig.slice(0, -1)
        expect(sig[sig.length - 1]).toBe(0x01)
        expect(verifyDer(der, digest, pubkey, false)).toBe(true)
        verified += 1
      })
    }
    expect(verified).toBeGreaterThan(0)
  })
})

describe('builders', async () => {
  const sender = await deriveAccountKey(MNEMONIC, 0)
  const recipient = await deriveAccountKey(MNEMONIC, 1)
  const coins: CoinUtxo[] = [
    { txid: 'aa'.repeat(32), vout: 0, value: 5_00000000n, height: 100 },
    { txid: 'bb'.repeat(32), vout: 1, value: 2_00000000n, height: 101 },
    { txid: 'cc'.repeat(32), vout: 2, value: 9_00000000n, height: 0 }
  ]
  const senderScript = addressToScript(sender.address)

  function verifyAllInputs(hex: string, prevScripts: Map<string, Uint8Array>) {
    const tx = parseTx(hex)
    tx.inputs.forEach((input, index) => {
      const sr = new ByteReader(input.scriptSig)
      const sig = sr.take(sr.u8())
      const pubkey = sr.take(sr.u8())
      expect(bytesToHex(pubkey)).toBe(bytesToHex(sender.pubkey))
      const digest = legacySighash(tx, index, prevScripts.get(`${input.txid}:${input.vout}`)!)
      expect(verifyDer(sig.slice(0, -1), digest, pubkey, true)).toBe(true)
    })
    return tx
  }

  test('native send pays recipient, returns change and never spends unconfirmed coins', () => {
    const built = buildNativeSend({
      senderAddress: sender.address,
      privateKey: sender.privateKey,
      coins,
      outputs: [{ address: recipient.address, value: 6_00000000n }],
      feePerByte: 2n
    })
    const tx = verifyAllInputs(built.hex, new Map(coins.map((c) => [`${c.txid}:${c.vout}`, senderScript])))
    expect(tx.inputs.map((i) => i.txid)).not.toContain('cc'.repeat(32))
    expect(tx.outputs[0].value).toBe(6_00000000n)
    expect(bytesToHex(tx.outputs[0].script)).toBe(bytesToHex(addressToScript(recipient.address)))
    expect(tx.outputs[1].value).toBe(7_00000000n - 6_00000000n - built.fee)
    expect(built.fee).toBeGreaterThanOrEqual(BigInt(built.size) * 2n)
    expect(built.fee).toBeLessThan(BigInt(built.size) * 2n + 20n)
  })

  test('send max spends all confirmed coins with no change', () => {
    const built = buildNativeSend({
      senderAddress: sender.address,
      privateKey: sender.privateKey,
      coins,
      outputs: [{ address: recipient.address, value: 0n }],
      feePerByte: 2n,
      sendMax: true
    })
    const tx = parseTx(built.hex)
    expect(tx.outputs).toHaveLength(1)
    expect(tx.outputs[0].value + built.fee).toBe(7_00000000n)
  })

  test('rejects sends larger than the confirmed balance', () => {
    expect(() => buildNativeSend({
      senderAddress: sender.address,
      privateKey: sender.privateKey,
      coins,
      outputs: [{ address: recipient.address, value: 7_00000000n }],
      feePerByte: 2n
    })).toThrow(/Insufficient/)
  })

  function assetUtxo(txid: string, amount: bigint, uniqueId: bigint | null = null): AssetUtxo {
    return {
      txid,
      vout: 0,
      assetId: ASSET,
      amount,
      height: 50,
      uniqueId,
      spendable: true,
      script: buildAssetTransferScript(senderScript, { assetId: ASSET, amount, uniqueId })
    }
  }

  test('fungible asset send conserves the asset and pays the fee in RTM', () => {
    const assets = [assetUtxo('dd'.repeat(32), 3_00000000n), assetUtxo('ee'.repeat(32), 1_50000000n)]
    const built = buildAssetSend({
      senderAddress: sender.address,
      privateKey: sender.privateKey,
      toAddress: recipient.address,
      assetId: ASSET,
      isUnique: false,
      amount: 4_00000000n,
      assetUtxos: assets,
      coins,
      feePerByte: 2n
    })
    const prev = new Map<string, Uint8Array>([
      ...assets.map((a) => [`${a.txid}:${a.vout}`, a.script] as [string, Uint8Array]),
      ...coins.map((c) => [`${c.txid}:${c.vout}`, senderScript] as [string, Uint8Array])
    ])
    const tx = verifyAllInputs(built.hex, prev)
    const transfers = tx.outputs.map((o) => ({ value: o.value, asset: parseAssetScript(o.script) }))
    const assetOuts = transfers.filter((t) => t.asset)
    expect(assetOuts.every((t) => t.value === 0n && t.asset!.canonical)).toBe(true)
    expect(assetOuts[0].asset!.amount).toBe(4_00000000n)
    expect(bytesToHex(assetOuts[0].asset!.recipientScript)).toBe(bytesToHex(addressToScript(recipient.address)))
    expect(assetOuts[1].asset!.amount).toBe(50000000n)
    expect(bytesToHex(assetOuts[1].asset!.recipientScript)).toBe(bytesToHex(senderScript))
    const rtmIn = coins.filter((c) => tx.inputs.some((i) => i.txid === c.txid)).reduce((n, c) => n + c.value, 0n)
    const rtmOut = transfers.filter((t) => !t.asset).reduce((n, t) => n + t.value, 0n)
    expect(rtmIn - rtmOut).toBe(built.fee)
  })

  test('unique asset send splits a token range', () => {
    const built = buildAssetSend({
      senderAddress: sender.address,
      privateKey: sender.privateKey,
      toAddress: recipient.address,
      assetId: ASSET,
      isUnique: true,
      amount: 2_00000000n,
      assetUtxos: [assetUtxo('ff'.repeat(32), 5_00000000n, 10n)],
      coins,
      feePerByte: 2n
    })
    const parsed = parseTx(built.hex).outputs.map((o) => parseAssetScript(o.script)).filter(Boolean)
    expect(parsed.map((p) => [p!.uniqueId, p!.amount])).toEqual([[10n, 2_00000000n], [12n, 3_00000000n]])
  })

  test('assets cannot go to P2SH addresses', () => {
    const payload = concatBytes(Uint8Array.of(0x10), hexToBytes('22'.repeat(20)))
    const p2sh = bs58.encode(concatBytes(payload, sha256d(payload).slice(0, 4)))
    expect(decodeAddress(p2sh)?.kind).toBe('p2sh')
    expect(() => buildAssetSend({
      senderAddress: sender.address,
      privateKey: sender.privateKey,
      toAddress: p2sh,
      assetId: ASSET,
      isUnique: false,
      amount: 1n,
      assetUtxos: [assetUtxo('dd'.repeat(32), 1n)],
      coins,
      feePerByte: 2n
    })).toThrow(/R\.\.\. addresses/)
  })
})
