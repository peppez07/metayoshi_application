/**
 * Live check of a supported Bitcoin-style coin against a real ElectrumX
 * server, through the wallet's own client. Skipped unless COIN_LIVE_SERVER is
 * set, e.g.
 *   COIN_LIVE_NETWORK=rvn COIN_LIVE_SERVER=wss://electrum1.cipig.net:30051 npx vitest run src/lib/electrum/__tests__/coinLive.test.ts
 *
 * It reads real transactions from recent blocks, so it needs no address with
 * funds: the parser must reproduce each txid, and every unspent output the
 * server lists for an address must be a plain coin output the wallet can
 * spend (never a Ravencoin-style asset output, which a coin send would burn).
 *
 * With COIN_LIVE_BROADCAST_PROBE=1 it also broadcasts a wallet-built, signed
 * transaction that spends an output that does not exist. Nodes check format
 * and standardness before looking up inputs, so a "missing inputs" rejection
 * shows the coin's nodes accept the wallet's transactions; nothing can be spent.
 */
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { ElectrumClient } from '../client'
import { RtmElectrum } from '../rtmElectrum'
import { NETWORKS } from '../../networks'
import { bytesToHex, concatBytes, hexToBytes, reverseBytes, sha256d } from '../../rtm/bytes'
import { addressToScript, addressToScriptHash, deriveAccountKey } from '../../rtm/address'
import { buildNativeSend } from '../../rtm/builder'
import { legacySendChain } from '../../coins/legacy'
import { p2pkhKeyHash, type Transaction } from '../../rtm/transaction'
import { describeTx, headerTime } from '../../rtm/history'
import { dustLimit, parseLegacyTx } from '../../coins/legacy'
import { encodeSegwitAddress } from '../../coins/bech32'
import bs58 from 'bs58'

const SERVER = process.env.COIN_LIVE_SERVER ?? ''
const BROADCAST_PROBE = process.env.COIN_LIVE_BROADCAST_PROBE === '1'
const PROBE_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const NETWORK = NETWORKS[process.env.COIN_LIVE_NETWORK ?? 'rvn']
/** Ravencoin asset scripts: P2PKH, then OP_RVN_ASSET (0xc0) and a payload starting "rvn". */
const ASSET_MARKER = '72766e'
/**
 * Addresses that held both RVN and assets in October 2026 (asset issuers found
 * through the issuance burn addresses). Override with COIN_LIVE_ASSET_ADDRESSES.
 */
const ASSET_HOLDERS: Record<string, string[]> = {
  rvn: ['RS9XXYF3PE2CfdaH4EEhTnVDPKmeyTnE8c', 'RSxrGdUdkg1f8AD5yZBnYvb5L38zoGVkBu', 'RCzitE8H2cAmJZ6WrtdKmTDokpVNrfCNCg', 'RB7pa9guAM7PSpkY7zXhzA1jcxQotC3hyK']
}
const KNOWN_ASSET_HOLDERS = process.env.COIN_LIVE_ASSET_ADDRESSES?.split(',').filter(Boolean) ?? ASSET_HOLDERS[NETWORK?.id] ?? []

/** The txid of a raw transaction, with any SegWit marker, flag and witnesses removed. */
function rawTxid(hex: string): string {
  const raw = hexToBytes(hex)
  if (raw[4] !== 0x00 || raw[5] === 0x00) return bytesToHex(reverseBytes(sha256d(raw)))
  // Strip the BIP144 marker/flag and witnesses: re-serialise version, inputs, outputs and lock time.
  const tx = parseLegacyTx(hex)
  const parts: Uint8Array[] = [raw.slice(0, 4), compact(tx.inputs.length)]
  for (const i of tx.inputs) parts.push(reverseBytes(hexToBytes(i.txid)), u32(i.vout), compact(i.scriptSig.length), i.scriptSig, u32(i.sequence))
  parts.push(compact(tx.outputs.length))
  for (const o of tx.outputs) parts.push(u64(o.value), compact(o.script.length), o.script)
  parts.push(raw.slice(raw.length - 4))
  return bytesToHex(reverseBytes(sha256d(concatBytes(...parts))))
}
const u32 = (n: number) => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n, true); return b }
const u64 = (n: bigint) => { const b = new Uint8Array(8); new DataView(b.buffer).setBigUint64(0, n, true); return b }
const compact = (n: number) => (n < 0xfd ? Uint8Array.of(n) : concatBytes(Uint8Array.of(0xfd), u32(n).slice(0, 2)))

function p2pkhAddress(script: Uint8Array): string | null {
  const hash = script.length === 25 ? p2pkhKeyHash(script) : script.length > 25 && script[25] === 0xc0 ? p2pkhKeyHash(script.slice(0, 25)) : null
  if (!hash) return null
  const payload = concatBytes(NETWORK.p2pkhPrefix, hash)
  return bs58.encode(concatBytes(payload, sha256d(payload).slice(0, 4)))
}

describe.skipIf(!SERVER)(`live ${NETWORK?.symbol} ElectrumX ${SERVER}`, () => {
  let api: RtmElectrum
  const seen: Array<{ txid: string; tx: Transaction; hex: string }> = []

  beforeAll(() => { api = new RtmElectrum(new ElectrumClient(SERVER), NETWORK) })
  afterAll(() => api.client.close())

  test('serves this coin\'s mainnet with a current chain tip', async () => {
    const features = await api.verifyNetwork()
    console.log('server:', features)
    expect(features.genesisHash).toBe(NETWORK.genesisHash)
    const tip = await api.tipHeight()
    const time = headerTime(await api.blockHeader(tip), NETWORK.headerTimeOffset)
    console.log(`tip ${tip}, block time ${new Date(time).toISOString()}`)
    expect(Math.abs(Date.now() - time)).toBeLessThan(6 * 3600_000)
  }, 30_000)

  test('real transactions from recent blocks parse to their txids', async () => {
    const tip = await api.tipHeight()
    for (let height = tip - 3; height > tip - 60 && seen.length < 60; height -= 1) {
      for (let pos = 1; pos < 15; pos += 1) {
        const txid = await api.client.request<string>('blockchain.transaction.id_from_pos', [height, pos]).catch(() => null)
        if (!txid) break
        const hex = await api.getTransactionAt(txid, height)
        expect(rawTxid(hex), txid).toBe(txid)
        seen.push({ txid, tx: parseLegacyTx(hex), hex })
      }
    }
    const assets = seen.filter((s) => s.hex.includes(ASSET_MARKER)).length
    const segwit = seen.filter((s) => s.hex.slice(8, 12) === '0001').length
    console.log(`parsed ${seen.length} transactions (${assets} with asset outputs, ${segwit} SegWit)`)
    expect(seen.length).toBeGreaterThan(5)
  }, 180_000)

  test('unspent outputs are plain coin outputs, so a send never spends an asset', async () => {
    // Addresses that received an asset in these blocks first, then plain receivers.
    const withAsset = new Set<string>()
    const plain = new Set<string>()
    for (const { tx } of seen) {
      for (const output of tx.outputs) {
        const address = p2pkhAddress(output.script)
        if (!address) continue
        if (output.script.length > 25) withAsset.add(address)
        else plain.add(address)
      }
    }
    for (const address of KNOWN_ASSET_HOLDERS) withAsset.add(address)
    const addresses = [...withAsset].slice(0, 8).concat([...plain].slice(0, 4))
    console.log(`checking ${addresses.length} addresses (${Math.min(withAsset.size, 8)} known asset holders)`)
    if (NETWORK.id === 'rvn') {
      // Asset outputs sit under the same P2PKH script; the server must still list only RVN outputs.
      const assetRows = await api.client.request<any[]>('blockchain.scripthash.listunspent', [addressToScriptHash(KNOWN_ASSET_HOLDERS[0], NETWORK), true]).catch(() => null)
      if (assetRows?.some((r) => 'asset' in r)) {
        console.log(`${KNOWN_ASSET_HOLDERS[0]}: ${assetRows.filter((r) => r.asset).length} asset outputs when asked for assets`)
        expect(assetRows.some((r) => r.asset)).toBe(true)
      } else {
        console.log('server has no asset index; asset outputs are indexed under other script hashes')
      }
    }
    expect(addresses.length).toBeGreaterThan(0)
    const fetched = new Map<string, Transaction>()
    const fetchTx = async (txid: string, height = 0) => {
      if (!fetched.has(txid)) fetched.set(txid, parseLegacyTx(await api.getTransactionAt(txid, height)))
      return fetched.get(txid)!
    }
    for (const address of addresses) {
      const [balance, utxos, history] = await Promise.all([api.balance(address), api.listUnspent(address).catch(() => null), api.history(address).catch(() => null)])
      if (!utxos || !history) { console.log(address, 'history too large for the server; skipped'); continue }
      const own = bytesToHex(addressToScript(address, NETWORK))
      for (const utxo of utxos.slice(0, 20)) {
        const output = (await fetchTx(utxo.txid, utxo.height)).outputs[utxo.vout]
        expect(bytesToHex(output.script), `${address} ${utxo.txid}:${utxo.vout}`).toBe(own)
        expect(output.value).toBe(utxo.value)
      }
      const confirmed = utxos.filter((u) => u.height > 0).reduce((n, u) => n + u.value, 0n)
      expect(confirmed).toBeLessThanOrEqual(balance.confirmed + (balance.unconfirmed > 0n ? balance.unconfirmed : 0n))
      const latest = history[history.length - 1]
      const effect = latest ? await describeTx(await fetchTx(latest.txid, latest.height), addressToScript(address, NETWORK), (id) => fetchTx(id).catch(() => null)) : null
      console.log(address, withAsset.has(address) ? '(asset holder)' : '', `balance ${balance.confirmed}`, `utxos ${utxos.length}`, `history ${history.length}`, effect && `latest delta ${effect.rtmDelta}`)
    }
  }, 300_000)

  test('fee and dust rules give a sendable transaction', async () => {
    const rates = await api.feeRates()
    const dust = dustLimit(NETWORK, rates.relayFeePerByte)
    console.log(`fee ${rates.feePerByte} sat/byte, relay ${rates.relayFeePerByte} sat/byte, dust ${dust} sats`)
    expect(rates.feePerByte).toBeGreaterThanOrEqual(rates.relayFeePerByte)
    // The largest send the wallet builds (200 inputs) stays under the coin's fee cap.
    expect(rates.feePerByte * BigInt(200 * 148 + 2 * 34 + 10)).toBeLessThan(NETWORK.maxFeeSats ?? 10_000_000n)
  }, 30_000)

  test.skipIf(!BROADCAST_PROBE)('nodes accept wallet-signed transactions (only the made-up input is refused)', async () => {
    const key = await deriveAccountKey(PROBE_MNEMONIC, 0, NETWORK)
    const rates = await api.feeRates()
    const chain = legacySendChain(NETWORK, rates.relayFeePerByte)
    // A coin that does not exist: a made-up txid, 1 coin, "confirmed".
    const coins = [{ txid: 'ab'.repeat(32), vout: 0, value: 100_000_000n, height: 1 }]
    const recipients = [(await deriveAccountKey(PROBE_MNEMONIC, 1, NETWORK)).address]
    // P2SH, then native SegWit and (where Taproot is active) Taproot.
    const p2sh = concatBytes(NETWORK.p2shPrefix, new Uint8Array(20).fill(5))
    recipients.push(bs58.encode(concatBytes(p2sh, sha256d(p2sh).slice(0, 4))))
    if (NETWORK.bech32Hrp) recipients.push(encodeSegwitAddress(NETWORK.bech32Hrp, 0, new Uint8Array(20).fill(7)))
    if (NETWORK.bech32Hrp && ['btc', 'ltc'].includes(NETWORK.id)) recipients.push(encodeSegwitAddress(NETWORK.bech32Hrp, 1, new Uint8Array(32).fill(9)))
    for (const to of recipients) {
      const built = buildNativeSend({ senderAddress: key.address, privateKey: key.privateKey, coins, outputs: [{ address: to, value: 10_000_000n }], feePerByte: rates.feePerByte, chain })
      const error = await api.broadcast(built.hex).then(() => null, (e: Error) => e.message)
      console.log(`to ${to}: ${error}`)
      expect(error).toMatch(/missing|inputs-missingorspent|missingorspent/i)
    }
  }, 60_000)
})
