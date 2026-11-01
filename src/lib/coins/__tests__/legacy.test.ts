import { describe, expect, test } from 'vitest'
import * as secp from '@noble/secp256k1'
import { ALL_NETWORKS, NETWORKS, NETWORK_IDS } from '../../networks'
import { CATALOG } from '../catalog'
import { addressToScript, decodeAddress, deriveAccountKey, isValidAddress, privateKeyToWif } from '../../rtm/address'
import { bytesToHex, concatBytes, hexToBytes, sha256d } from '../../rtm/bytes'
import bs58 from 'bs58'
import { buildNativeSend } from '../../rtm/builder'
import { legacySighash, type Transaction } from '../../rtm/transaction'
import { decodeSegwitAddress, encodeSegwitAddress } from '../bech32'
import { dustLimit, LEGACY_TX_VERSION, legacySendChain, parseLegacyTx } from '../legacy'

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

describe('catalog', () => {
  test('every supported coin has consistent parameters', () => {
    const ids = new Set<string>()
    for (const network of ALL_NETWORKS.filter((n) => n.supported)) {
      expect(ids.has(network.id)).toBe(false)
      ids.add(network.id)
      expect(network.genesisHash).toMatch(/^[0-9a-f]{64}$/)
      expect(network.bip44CoinType).toBeGreaterThanOrEqual(0)
      expect([1, 2, 3]).toContain(network.p2pkhPrefix.length)
      for (const p2sh of network.p2shPrefixes) expect(p2sh.length).toBe(network.p2pkhPrefix.length)
      expect(network.addressPrefix.length).toBeGreaterThan(0)
      expect(network.wifVersion).toBeGreaterThanOrEqual(0)
    }
    expect(CATALOG.length).toBe(111)
    expect(NETWORK_IDS.slice(0, 2)).toEqual(['rtm', 'btcz'])
  })

  test('only implemented families are offered', () => {
    for (const network of ALL_NETWORKS) {
      if (['rtm', 'btcz', 'legacy'].includes(network.family) && network.bip44CoinType >= 0) expect(network.supported).toBe(true)
      else expect(network.supported).toBe(false)
    }
    expect(NETWORK_IDS.length).toBe(2 + 66)
  })

  test('every supported coin round-trips its own addresses and no other coin\'s', async () => {
    const key = await deriveAccountKey(MNEMONIC, 0, NETWORKS.btc)
    const supported = ALL_NETWORKS.filter((n) => n.supported)
    for (const network of supported) {
      const derived = await deriveAccountKey(MNEMONIC, 0, network)
      expect(network.addressPrefix.split('/').some((prefix) => derived.address.startsWith(prefix))).toBe(true)
      expect(decodeAddress(derived.address, network)?.kind).toBe('p2pkh')
      expect(bytesToHex(addressToScript(derived.address, network))).toMatch(/^76a914[0-9a-f]{40}88ac$/)
      const others = supported.filter((n) => bytesToHex(n.p2pkhPrefix) !== bytesToHex(network.p2pkhPrefix) &&
        !n.p2shPrefixes.some((p) => bytesToHex(p) === bytesToHex(network.p2pkhPrefix)))
      for (const other of others) expect(isValidAddress(derived.address, other)).toBe(false)
    }
    expect(key.address).toBe('1LqBGSKuX5yYUonjxT5qGfpUsXKYYWeabA')
  })
})

describe('BIP44 addresses from the standard test phrase', () => {
  test.each([
    ['btc', '1LqBGSKuX5yYUonjxT5qGfpUsXKYYWeabA'],
    ['ltc', 'LUWPbpM43E2p7ZSh8cyTBEkvpHmr3cB8Ez'],
    ['doge', 'DBus3bamQjgJULBJtYXpEzDWQRwF5iwxgC'],
    ['dash', 'XoJA8qE3N2Y3jMLEtZ3vcN42qseZ8LvFf5']
  ])('%s', async (id, expected) => {
    expect((await deriveAccountKey(MNEMONIC, 0, NETWORKS[id])).address).toBe(expected)
  })

  test('WIF uses the coin\'s version byte', async () => {
    const key = await deriveAccountKey(MNEMONIC, 0, NETWORKS.btc)
    expect(privateKeyToWif(key.privateKey, NETWORKS.btc)).toMatch(/^[KL]/)
    expect(privateKeyToWif(key.privateKey, NETWORKS.ltc)).toMatch(/^T/)
    expect(privateKeyToWif(key.privateKey, NETWORKS.doge)).toMatch(/^Q/)
  })
})

describe('bech32 / bech32m (BIP173, BIP350)', () => {
  test('decodes the specification vectors', () => {
    expect(decodeSegwitAddress('bc', 'BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4')).toEqual({
      version: 0, program: hexToBytes('751e76e8199196d454941c45d1b3a323f1433bd6')
    })
    expect(decodeSegwitAddress('bc', 'bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3')?.program).toHaveLength(32)
    expect(decodeSegwitAddress('bc', 'bc1pw508d6qejxtdg4y5r3zarvary0c5xw7kw508d6qejxtdg4y5r3zarvary0c5xw7kt5nd6y')).toMatchObject({ version: 1 })
    // BIP86 test phrase, m/86'/0'/0'/0/0.
    expect(decodeSegwitAddress('bc', 'bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr')?.program).toHaveLength(32)
  })

  test('rejects wrong checksums, mixed case, other networks and v0 with bech32m', () => {
    expect(decodeSegwitAddress('bc', 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t5')).toBeNull()
    expect(decodeSegwitAddress('bc', 'bc1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4')).toBeNull()
    expect(decodeSegwitAddress('ltc', 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4')).toBeNull()
    // BIP350 invalid vector: witness v0 encoded with the bech32m constant.
    expect(decodeSegwitAddress('bc', 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kemeawh')).toBeNull()
  })

  test('encodes what it decodes, for each coin with a prefix', () => {
    const program = hexToBytes('751e76e8199196d454941c45d1b3a323f1433bd6')
    for (const network of Object.values(NETWORKS).filter((n) => n.bech32Hrp)) {
      const address = encodeSegwitAddress(network.bech32Hrp!, 0, program)
      expect(decodeAddress(address, network)).toEqual({ kind: 'witness', hash: program, witnessVersion: 0 })
      expect(bytesToHex(addressToScript(address, network))).toBe(`0014${bytesToHex(program)}`)
    }
    expect(encodeSegwitAddress('bc', 0, program)).toBe('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4')
  })
})

describe('legacy transaction parsing', () => {
  const input = concatBytes(new Uint8Array(32).fill(0x11), hexToBytes('01000000'), hexToBytes('00'), hexToBytes('ffffffff'))
  const output = concatBytes(hexToBytes('e803000000000000'), hexToBytes('19'), hexToBytes(`76a914${'22'.repeat(20)}88ac`))

  test('reads plain, SegWit, MWEB-flagged and Dash special transactions', () => {
    const body = concatBytes(hexToBytes('01'), input, hexToBytes('01'), output)
    const plain = concatBytes(hexToBytes('01000000'), body, hexToBytes('00000000'))
    const segwit = concatBytes(hexToBytes('02000000'), hexToBytes('0001'), body, hexToBytes('0102aabb'), hexToBytes('00000000'))
    const mweb = concatBytes(hexToBytes('02000000'), hexToBytes('0008'), body, hexToBytes('00ff'), hexToBytes('00000000'))
    const dash = concatBytes(hexToBytes('03000500'), body, hexToBytes('00000000'), hexToBytes('03aabbcc'))
    for (const raw of [plain, segwit, mweb, dash]) {
      const tx = parseLegacyTx(bytesToHex(raw))
      expect(tx.inputs).toHaveLength(1)
      expect(tx.inputs[0].txid).toBe('11'.repeat(32))
      expect(tx.inputs[0].vout).toBe(1)
      expect(tx.outputs).toEqual([{ value: 1000n, script: hexToBytes(`76a914${'22'.repeat(20)}88ac`) }])
    }
  })
})

describe('legacy signing', () => {
  test('builds version-1 P2PKH transactions with valid signatures, paying SegWit addresses', async () => {
    const network = NETWORKS.ltc
    const key = await deriveAccountKey(MNEMONIC, 0, network)
    const to = encodeSegwitAddress('ltc', 0, hexToBytes('751e76e8199196d454941c45d1b3a323f1433bd6'))
    const chain = legacySendChain(network, 10n)
    const built = buildNativeSend({
      senderAddress: key.address,
      privateKey: key.privateKey,
      coins: [{ txid: 'aa'.repeat(32), vout: 0, value: 50_000_000n, height: 100 }],
      outputs: [{ address: to, value: 10_000_000n }],
      feePerByte: 20n,
      chain
    })
    const tx = parseLegacyTx(built.hex)
    expect(tx.version).toBe(LEGACY_TX_VERSION)
    expect(bytesToHex(tx.outputs[0].script)).toBe('0014751e76e8199196d454941c45d1b3a323f1433bd6')
    expect(tx.outputs[1].value).toBe(50_000_000n - 10_000_000n - built.fee)
    const ownScript = addressToScript(key.address, network)
    const unsigned: Transaction = { ...tx, locktime: 0, inputs: tx.inputs.map((i) => ({ ...i, scriptSig: new Uint8Array() })) }
    const digest = legacySighash(unsigned, 0, ownScript)
    const scriptSig = tx.inputs[0].scriptSig
    const der = scriptSig.slice(1, scriptSig[0])
    const rLength = der[3]
    const pad = (n: Uint8Array) => { const o = new Uint8Array(32); o.set(n.slice(-32), 32 - Math.min(32, n.length)); return o }
    const compact = concatBytes(pad(der.slice(4, 4 + rLength)), pad(der.slice(6 + rLength)))
    expect(secp.verify(compact, digest, key.pubkey, { prehash: false })).toBe(true)
  })

  test('dust follows the relay fee and the coin\'s floor', () => {
    expect(dustLimit(NETWORKS.btc, 1n)).toBe(1000n)
    expect(dustLimit(NETWORKS.ltc, 10n)).toBe(5460n)
    expect(dustLimit(NETWORKS.doge, 1000n)).toBe(1_000_000n)
  })
})

describe('cross-checked with Trezor firmware coin definitions', () => {
  test.each([
    // [coin, P2PKH address that Trezor's address_type produces for the test phrase prefix check]
    ['crw', 'CRW'],
    ['dgb', 'D'],
    ['btc', '1'],
    ['ltc', 'L']
  ])('%s addresses start with %s', async (id, prefix) => {
    const address = (await deriveAccountKey(MNEMONIC, 0, NETWORKS[id])).address
    expect(address.startsWith(prefix)).toBe(true)
    expect(isValidAddress(address, NETWORKS[id])).toBe(true)
  })

  test('DigiByte accepts both its current (S…) and old (3…) script addresses', () => {
    const hash = new Uint8Array(20).fill(9)
    for (const version of [0x3f, 0x05]) {
      const payload = concatBytes(Uint8Array.of(version), hash)
      const address = bs58.encode(concatBytes(payload, sha256d(payload).slice(0, 4)))
      expect(decodeAddress(address, NETWORKS.dgb)).toEqual({ kind: 'p2sh', hash })
    }
  })

  test('dust limits and fee floors follow the coins\' node policy', () => {
    expect(NETWORKS.mona.dustSats).toBe(54_600n)
    expect(NETWORKS.via.dustSats).toBe(54_600n)
    expect(NETWORKS.doge.dustSats).toBe(1_000_000n)
    expect(NETWORKS.fjc.minFeePerByte).toBe(10_000n)
    // Trezor lists Dogecoin's 0.001 DOGE/kB relay floor; the wallet pays Core's recommended 0.01 DOGE/kB.
    expect(NETWORKS.doge.minFeePerByte).toBe(1_000n)
    expect(NETWORKS.doge.maxFeeSats).toBe(500_000_000n)
    expect(NETWORKS.btc.maxFeeSats).toBeUndefined()
    expect(NETWORKS.btc.minFeePerByte).toBe(0n)
    expect(NETWORKS.fjc.bech32Hrp).toBe('fc')
  })
})
