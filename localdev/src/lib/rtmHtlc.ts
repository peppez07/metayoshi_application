import { hexToBytes, bytesToHex } from '@noble/hashes/utils'
import { sha256 } from '@noble/hashes/sha256'
import { hmac } from '@noble/hashes/hmac'
import { ripemd160 } from '@noble/hashes/ripemd160'
import * as secp from '@noble/secp256k1'
import { getCoinApiInterceptor } from '../coins/interceptors'
import { getBuildFeatureFlag } from '../buildConfig'
import type { Network } from '../coins'
import { resolvePublicApiBaseUrl } from './apiBase'
import { createRawTransaction, getAddressUtxos, listUtxoUnspent, prepareRtmAssetNonCustodialTransaction, scanAddressUnspent, sendRawTransaction, type UtxoRpcConfig, type UtxoUnspent } from './utxoRpc'
import { addressToScriptPubKeyHex, redeemScriptToP2shAddress, redeemScriptToP2shScriptPubKeyHex } from './utxoAddress'

if (!secp.hashes.sha256) {
  secp.hashes.sha256 = (msg: Uint8Array) => sha256(msg)
}
if (!secp.hashes.hmacSha256) {
  secp.hashes.hmacSha256 = (key: Uint8Array, msg: Uint8Array) => hmac(sha256, key, msg)
}

export type RtmOrderMarketActionKind =
  | 'fund_seller_asset'
  | 'fund_seller_fee'
  | 'fund_buyer_rtm'
  | 'claim_buyer_rtm'
  | 'claim_seller_asset'
  | 'refund_seller_asset'
  | 'refund_buyer_rtm'

export type RtmListingMarketActionKind =
  | 'lock_listing_asset'
  | 'unlock_listing_asset'
  | 'refund_listing_asset'

export type RtmMarketActionKind = RtmOrderMarketActionKind | RtmListingMarketActionKind

type RtmMarketActionBase = {
  version: 1
  kind: RtmMarketActionKind
  networkId: 'rtm'
  orderDigest?: string
  listingDigest?: string
  toAddress?: string
  amount?: string
  grossAmount?: string
  feeBps?: number
  feeAmount?: string
  feeRecipientAddress?: string
  assetId?: string
  qty?: string
  fromAddress?: string
  redeemScriptHex?: string
  refundLocktime?: number
  secretHash?: string
  secret?: string
}

export type RtmOrderMarketAction = RtmMarketActionBase & {
  kind: RtmOrderMarketActionKind
  orderId: string
  listingId?: never
}

export type RtmListingMarketAction = RtmMarketActionBase & {
  kind: RtmListingMarketActionKind
  listingId: string
  orderId?: never
}

export type RtmMarketAction = RtmOrderMarketAction | RtmListingMarketAction

export type RtmMarketOrderSnapshot = {
  orderId: string
  orderDigest: string
  sellerAddress: string
  buyerAddress: string
  assetId: string
  qty: string
  priceRtm: string
  sellerNetAmountRtm: string
  platformFeeBps: number
  platformFeeAddress: string
  platformFeeAmountRtm: string
  sellerLockAddress: string
  sellerLockRedeemScriptHex: string
  sellerRefundLocktime: number
  buyerLockAddress: string
  buyerLockRedeemScriptHex: string
  buyerRefundLocktime: number
  sellerFeeReserveRtm: string
  secretHash: string
  revealedSecret?: string
  platformFeeConfigured?: boolean
}

export type RtmMarketListingSnapshot = {
  listingId: string
  listingDigest: string
  sellerAddress: string
  sellerPubkeyHex: string
  assetId: string
  qty: string
  availableQty?: string
  remainingQty?: string
  status?: string
  secretHash: string
  listingLockAddress: string
  listingLockRedeemScriptHex: string
  listingRefundLocktime: number
  revealedSecret?: string
}

type TxInput = {
  txid: string
  vout: number
  scriptSig: Uint8Array
  sequence: number
}

type TxOutput = {
  amountSats: number
  scriptPubKey: Uint8Array
}

type TxData = {
  version: number
  inputs: TxInput[]
  outputs: TxOutput[]
  locktime: number
}

type UnsignedTxInput = {
  txid: string
  vout: number
  scriptPubKeyHex: string
  amountSats: number
}

const SIGHASH_ALL = 0x01
const FINAL_SEQUENCE = 0xffffffff
const NON_FINAL_SEQUENCE = 0xfffffffe
const DUST_SATS = 1000

function concatBytes(...arrs: Uint8Array[]) {
  const len = arrs.reduce((n, a) => n + a.length, 0)
  const out = new Uint8Array(len)
  let offset = 0
  for (const arr of arrs) {
    out.set(arr, offset)
    offset += arr.length
  }
  return out
}

function u32LE(n: number) {
  const out = new Uint8Array(4)
  new DataView(out.buffer).setUint32(0, n >>> 0, true)
  return out
}

function u64LE(n: number) {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error('invalid_u64')
  const out = new Uint8Array(8)
  let value = BigInt(n)
  for (let i = 0; i < 8; i += 1) {
    out[i] = Number(value & 0xffn)
    value >>= 8n
  }
  return out
}

function reverseBytes(value: Uint8Array) {
  return Uint8Array.from(value).reverse()
}

function encodeVarInt(n: number) {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error('invalid_varint')
  if (n < 0xfd) return new Uint8Array([n])
  if (n <= 0xffff) {
    const out = new Uint8Array(3)
    out[0] = 0xfd
    new DataView(out.buffer).setUint16(1, n, true)
    return out
  }
  return concatBytes(new Uint8Array([0xfe]), u32LE(n))
}

function pushData(data: Uint8Array) {
  if (data.length > 0xff) throw new Error('pushdata_too_large')
  return concatBytes(new Uint8Array([data.length]), data)
}

function doubleSha256(data: Uint8Array) {
  return sha256(sha256(data))
}

function compactToDer(compactSig: Uint8Array) {
  if (compactSig.length !== 64) throw new Error('invalid_compact_signature')
  const encodeInt = (value: Uint8Array) => {
    let start = 0
    while (start < value.length - 1 && value[start] === 0) start += 1
    let body = value.slice(start)
    if (body[0] & 0x80) {
      const prefixed = new Uint8Array(body.length + 1)
      prefixed[0] = 0
      prefixed.set(body, 1)
      body = prefixed
    }
    return concatBytes(new Uint8Array([0x02, body.length]), body)
  }
  const r = encodeInt(compactSig.slice(0, 32))
  const s = encodeInt(compactSig.slice(32, 64))
  return concatBytes(new Uint8Array([0x30, r.length + s.length]), r, s)
}

function serializeTx(tx: TxData) {
  return concatBytes(
    u32LE(tx.version),
    encodeVarInt(tx.inputs.length),
    ...tx.inputs.map((vin) => concatBytes(
      reverseBytes(hexToBytes(vin.txid)),
      u32LE(vin.vout),
      encodeVarInt(vin.scriptSig.length),
      vin.scriptSig,
      u32LE(vin.sequence)
    )),
    encodeVarInt(tx.outputs.length),
    ...tx.outputs.map((vout) => concatBytes(
      u64LE(vout.amountSats),
      encodeVarInt(vout.scriptPubKey.length),
      vout.scriptPubKey
    )),
    u32LE(tx.locktime)
  )
}

function parseVarInt(raw: Uint8Array, offset: number): { value: number; nextOffset: number } {
  const prefix = raw[offset]
  if (prefix < 0xfd) return { value: prefix, nextOffset: offset + 1 }
  if (prefix === 0xfd) {
    const value = new DataView(raw.buffer, raw.byteOffset + offset + 1, 2).getUint16(0, true)
    return { value, nextOffset: offset + 3 }
  }
  const value = new DataView(raw.buffer, raw.byteOffset + offset + 1, 4).getUint32(0, true)
  return { value, nextOffset: offset + 5 }
}

function parseLegacyTx(unsignedHex: string): TxData {
  const hex = String(unsignedHex || '').trim()
  if (!hex || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) throw new Error('invalid_raw_transaction_hex')
  const raw = hexToBytes(hex)
  let offset = 0
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength)
  const version = view.getUint32(offset, true)
  offset += 4
  const vinCount = parseVarInt(raw, offset)
  offset = vinCount.nextOffset
  const inputs: TxInput[] = []
  for (let i = 0; i < vinCount.value; i += 1) {
    const txid = bytesToHex(reverseBytes(raw.slice(offset, offset + 32)))
    offset += 32
    const vout = view.getUint32(offset, true)
    offset += 4
    const scriptLen = parseVarInt(raw, offset)
    offset = scriptLen.nextOffset
    const scriptSig = raw.slice(offset, offset + scriptLen.value)
    offset += scriptLen.value
    const sequence = view.getUint32(offset, true)
    offset += 4
    inputs.push({ txid, vout, scriptSig, sequence })
  }
  const voutCount = parseVarInt(raw, offset)
  offset = voutCount.nextOffset
  const outputs: TxOutput[] = []
  for (let i = 0; i < voutCount.value; i += 1) {
    const amountSats = Number(view.getBigUint64(offset, true))
    offset += 8
    const scriptLen = parseVarInt(raw, offset)
    offset = scriptLen.nextOffset
    const scriptPubKey = raw.slice(offset, offset + scriptLen.value)
    offset += scriptLen.value
    outputs.push({ amountSats, scriptPubKey })
  }
  const locktime = view.getUint32(offset, true)
  return { version, inputs, outputs, locktime }
}

function signatureHashLegacy(tx: TxData, inputIndex: number, scriptCode: Uint8Array) {
  const tmp: TxData = {
    version: tx.version,
    inputs: tx.inputs.map((vin, i) => ({
      ...vin,
      scriptSig: i === inputIndex ? scriptCode : new Uint8Array()
    })),
    outputs: tx.outputs,
    locktime: tx.locktime
  }
  return doubleSha256(concatBytes(serializeTx(tmp), u32LE(SIGHASH_ALL)))
}

function sat(value: string) {
  const raw = String(value || '').trim()
  if (!/^\d+(\.\d+)?$/.test(raw)) throw new Error('invalid_decimal_amount')
  const [whole, fractional = ''] = raw.split('.')
  const padded = `${whole}${fractional.padEnd(8, '0').slice(0, 8)}`
  return Number(BigInt(padded))
}

function coins8(value: number) {
  return Number((value / 1e8).toFixed(8))
}

function normalizeHex(value: string, label: string) {
  const normalized = String(value || '').trim().toLowerCase().replace(/^0x/i, '')
  if (!normalized || normalized.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(normalized)) {
    throw new Error(`${label}_must_be_hex`)
  }
  return normalized
}

function loadLockScriptPubKeyHex(redeemScriptHex: string) {
  return redeemScriptToP2shScriptPubKeyHex(redeemScriptHex)
}

async function loadLockUtxos(rpcConfig: UtxoRpcConfig, lockAddress: string, redeemScriptHex: string): Promise<UtxoUnspent[]> {
  let unspent: UtxoUnspent[] = []
  try {
    unspent = await getAddressUtxos(rpcConfig, lockAddress, 1)
  } catch {}
  if (unspent.length === 0) {
    try {
      unspent = await listUtxoUnspent(rpcConfig, lockAddress, 1)
    } catch {}
  }
  if (unspent.length === 0) {
    unspent = await scanAddressUnspent(rpcConfig, lockAddress)
  }
  const expectedScriptPubKeyHex = loadLockScriptPubKeyHex(redeemScriptHex)
  return unspent.filter((utxo) => (
    String(utxo.address || lockAddress).trim() === lockAddress
    && String(utxo.scriptPubKey || '').trim().toLowerCase() === expectedScriptPubKeyHex
    && Number(utxo.confirmations || 0) >= 1
  ))
}

function buildUnsignedP2pkhTransaction(inputs: UnsignedTxInput[], toAddress: string, amountSats: number, sequence: number, locktime: number): string {
  const tx: TxData = {
    version: 2,
    inputs: inputs.map((input) => ({
      txid: input.txid,
      vout: input.vout,
      scriptSig: new Uint8Array(),
      sequence
    })),
    outputs: [{
      amountSats,
      scriptPubKey: hexToBytes(addressToScriptPubKeyHex(toAddress, 'RTM'))
    }],
    locktime
  }
  return bytesToHex(serializeTx(tx))
}

function buildUnsignedAddressTransaction(inputs: UnsignedTxInput[], outputs: Array<{ toAddress: string; amountSats: number }>, sequence: number, locktime: number): string {
  const tx: TxData = {
    version: 2,
    inputs: inputs.map((input) => ({
      txid: input.txid,
      vout: input.vout,
      scriptSig: new Uint8Array(),
      sequence
    })),
    outputs: outputs.map((output) => ({
      amountSats: output.amountSats,
      scriptPubKey: hexToBytes(addressToScriptPubKeyHex(output.toAddress, 'RTM'))
    })),
    locktime
  }
  return bytesToHex(serializeTx(tx))
}

function signRtmHtlcRawTransaction(params: {
  rawHex: string
  signingInputs: UnsignedTxInput[]
  redeemScriptHex: string
  privHex: string
  mode: 'claim' | 'refund'
  secretHex?: string
  refundLocktime?: number
}) {
  const redeemScriptHex = normalizeHex(params.redeemScriptHex, 'redeem_script')
  const redeemScriptBytes = hexToBytes(redeemScriptHex)
  const tx = parseLegacyTx(params.rawHex)
  if (tx.inputs.length !== params.signingInputs.length) throw new Error('htlc_signing_input_mismatch')
  if (params.mode === 'refund') {
    tx.locktime = Math.max(1, Math.trunc(Number(params.refundLocktime || 0)))
    tx.inputs = tx.inputs.map((input) => ({ ...input, sequence: NON_FINAL_SEQUENCE }))
  }
  const priv = hexToBytes(normalizeHex(params.privHex, 'private_key'))
  tx.inputs = tx.inputs.map((input, index) => {
    const sighash = signatureHashLegacy(tx, index, redeemScriptBytes)
    const compactSig = secp.sign(sighash, priv)
    const derPlusType = concatBytes(compactToDer(compactSig), new Uint8Array([SIGHASH_ALL]))
    const scriptParts = [pushData(derPlusType)]
    if (params.mode === 'claim') {
      const secretHex = normalizeHex(String(params.secretHex || ''), 'secret')
      scriptParts.push(pushData(hexToBytes(secretHex)))
      scriptParts.push(pushData(new Uint8Array([1])))
    } else {
      scriptParts.push(pushData(new Uint8Array()))
    }
    scriptParts.push(pushData(redeemScriptBytes))
    return {
      ...input,
      scriptSig: concatBytes(...scriptParts)
    }
  })
  return bytesToHex(serializeTx(tx))
}

export function createRtmMarketRpcConfig(net: Network, signBackendAuthMessage?: (message: string) => Promise<{ address: string; signature: string }>): UtxoRpcConfig {
  const env = (import.meta as any)?.env || {}
  return {
    networkId: net.id,
    coinSymbol: net.symbol,
    apiInterceptor: getCoinApiInterceptor(net.id),
    rpcUrl: net.rpcUrl,
    rpcWallet: net.rpcWallet,
    rpcUsername: net.rpcUsername,
    rpcPassword: net.rpcPassword,
    bridgeUrl: net.bridgeUrl,
    bridgeUsername: net.bridgeUsername,
    bridgePassword: net.bridgePassword,
    secureBridgeApiBaseUrl: String(import.meta.env.VITE_SECURE_BRIDGE_API_BASE_URL || '').trim() || undefined,
    secureBridgeWritesEnabled: getBuildFeatureFlag('bridgeSecureWritesEnabled', 'VITE_BRIDGE_SECURE_WRITES_ENABLED', true),
    secureBridgeSigner: signBackendAuthMessage,
    useLocalRpc: false
  }
}

export function buildRtmHtlcRedeemScriptHex(params: {
  secretHashHex: string
  claimPubkeyHex: string
  refundPubkeyHex: string
  refundLocktime: number
}) {
  const secretHashHex = normalizeHex(params.secretHashHex, 'secret_hash')
  const claimPubkeyHex = normalizeHex(params.claimPubkeyHex, 'claim_pubkey')
  const refundPubkeyHex = normalizeHex(params.refundPubkeyHex, 'refund_pubkey')
  const refundLocktime = Math.max(1, Math.trunc(Number(params.refundLocktime || 0)))
  const encodePush = (dataHex: string) => {
    const normalized = normalizeHex(dataHex, 'pushdata')
    const length = normalized.length / 2
    if (length > 75) throw new Error('pushdata_too_large')
    return `${length.toString(16).padStart(2, '0')}${normalized}`
  }
  const encodeScriptNumber = (value: number) => {
    if (value === 0) return '00'
    let remaining = value
    const bytes: number[] = []
    while (remaining > 0) {
      bytes.push(remaining & 0xff)
      remaining >>= 8
    }
    if (bytes[bytes.length - 1]! & 0x80) bytes.push(0)
    return encodePush(Buffer.from(bytes).toString('hex'))
  }
  return [
    '63',
    'a8',
    encodePush(secretHashHex),
    '88',
    encodePush(claimPubkeyHex),
    'ac',
    '67',
    encodeScriptNumber(refundLocktime),
    'b1',
    '75',
    encodePush(refundPubkeyHex),
    'ac',
    '68'
  ].join('')
}

export function redeemScriptToRtmP2shAddress(redeemScriptHex: string) {
  return redeemScriptToP2shAddress(redeemScriptHex, 'RTM')
}

function getMarketApiBaseUrl() {
  return resolvePublicApiBaseUrl((import.meta as any)?.env?.VITE_API_BASE_URL)
}

async function fetchMarketJson<T>(path: string): Promise<T> {
  const response = await fetch(`${getMarketApiBaseUrl().replace(/\/+$/, '')}${path}`)
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(String((body as any)?.error || response.statusText || 'market_request_failed'))
  }
  return body as T
}

export async function loadRtmMarketOrder(orderId: string): Promise<RtmMarketOrderSnapshot> {
  return await fetchMarketJson<RtmMarketOrderSnapshot>(`/v1/market/rtm/orders/${encodeURIComponent(orderId)}`)
}

function normalizeRtmMarketListingSnapshot(raw: Record<string, unknown>): RtmMarketListingSnapshot {
  const listingRefundLocktime = Math.max(0, Math.trunc(Number(raw.listingRefundLocktime ?? raw.refundLocktime ?? 0)))
  const sellerPubkeyHex = String(raw.sellerPubkeyHex ?? '').trim()
  const secretHash = String(raw.secretHash ?? '').trim()
  const computedRedeemScriptHex = (
    sellerPubkeyHex
    && secretHash
    && listingRefundLocktime > 0
  )
    ? buildRtmHtlcRedeemScriptHex({
        secretHashHex: secretHash,
        claimPubkeyHex: sellerPubkeyHex,
        refundPubkeyHex: sellerPubkeyHex,
        refundLocktime: listingRefundLocktime
      })
    : ''
  const listingLockRedeemScriptHex = String(raw.listingLockRedeemScriptHex ?? computedRedeemScriptHex).trim()
  const listingLockAddress = String(
    raw.listingLockAddress
    ?? (listingLockRedeemScriptHex ? redeemScriptToRtmP2shAddress(listingLockRedeemScriptHex) : '')
  ).trim()

  return {
    listingId: String(raw.listingId ?? '').trim(),
    listingDigest: String(raw.listingDigest ?? raw.orderDigest ?? '').trim(),
    sellerAddress: String(raw.sellerAddress ?? '').trim(),
    sellerPubkeyHex,
    assetId: String(raw.assetId ?? '').trim(),
    qty: String(raw.qty ?? raw.availableQty ?? raw.remainingQty ?? '').trim(),
    availableQty: raw.availableQty == null ? undefined : String(raw.availableQty).trim(),
    remainingQty: raw.remainingQty == null ? undefined : String(raw.remainingQty).trim(),
    status: raw.status == null ? undefined : String(raw.status).trim(),
    secretHash,
    listingLockAddress,
    listingLockRedeemScriptHex,
    listingRefundLocktime,
    revealedSecret: raw.revealedSecret == null ? undefined : String(raw.revealedSecret).trim()
  }
}

export async function loadRtmMarketListing(listingId: string): Promise<RtmMarketListingSnapshot> {
  const raw = await fetchMarketJson<Record<string, unknown>>(`/v1/market/rtm/listings/${encodeURIComponent(listingId)}`)
  return normalizeRtmMarketListingSnapshot(raw)
}

function assertEqualString(actual: unknown, expected: unknown, label: string) {
  const left = String(actual ?? '').trim()
  const right = String(expected ?? '').trim()
  if (left !== right) throw new Error(`${label}_mismatch`)
}

function assertEqualNumber(actual: unknown, expected: unknown, label: string) {
  if (Number(actual) !== Number(expected)) throw new Error(`${label}_mismatch`)
}

function assertSecretMatchesSecretHash(secretHex: unknown, secretHashHex: unknown, label: string) {
  const normalizedSecret = normalizeHex(String(secretHex || ''), label)
  const normalizedSecretHash = normalizeHex(String(secretHashHex || ''), `${label}_hash`)
  const actualHash = bytesToHex(sha256(hexToBytes(normalizedSecret)))
  if (actualHash !== normalizedSecretHash) {
    throw new Error(`${label}_hash_mismatch`)
  }
}

export function isRtmOrderMarketAction(action: RtmMarketAction): action is RtmOrderMarketAction {
  return 'orderId' in action && typeof action.orderId === 'string' && String(action.orderId || '').trim().length > 0
}

export function isRtmListingMarketAction(action: RtmMarketAction): action is RtmListingMarketAction {
  return 'listingId' in action && typeof action.listingId === 'string' && String(action.listingId || '').trim().length > 0
}

export function assertRtmMarketActionMatchesOrder(action: RtmOrderMarketAction, order: RtmMarketOrderSnapshot): void {
  assertEqualString(action.orderId, order.orderId, 'order_id')
  if (action.orderDigest) {
    assertEqualString(action.orderDigest, order.orderDigest, 'order_digest')
  }

  switch (action.kind) {
    case 'fund_seller_asset':
      assertEqualString(action.toAddress, order.sellerLockAddress, 'seller_lock_address')
      assertEqualString(action.assetId, order.assetId, 'asset_id')
      assertEqualString(action.qty, order.qty, 'asset_qty')
      break
    case 'fund_seller_fee':
      assertEqualString(action.toAddress, order.sellerLockAddress, 'seller_fee_lock_address')
      assertEqualString(action.amount, order.sellerFeeReserveRtm, 'seller_fee_reserve_amount')
      break
    case 'fund_buyer_rtm':
      assertEqualString(action.toAddress, order.buyerLockAddress, 'buyer_lock_address')
      assertEqualString(action.amount, order.priceRtm, 'buyer_lock_amount')
      break
    case 'claim_buyer_rtm':
      if (!order.platformFeeConfigured || !String(order.platformFeeAddress || '').trim()) {
        throw new Error('platform_fee_address_missing')
      }
      assertEqualString(action.fromAddress, order.buyerLockAddress, 'buyer_lock_address')
      assertEqualString(action.toAddress, order.sellerAddress, 'seller_payout_address')
      assertEqualString(action.redeemScriptHex, order.buyerLockRedeemScriptHex, 'buyer_lock_redeem_script')
      assertEqualString(action.secretHash, order.secretHash, 'secret_hash')
      assertEqualString(action.grossAmount || action.amount, order.priceRtm, 'gross_amount')
      assertEqualString(action.amount, order.sellerNetAmountRtm, 'seller_net_amount')
      assertEqualNumber(action.feeBps, order.platformFeeBps, 'platform_fee_bps')
      assertEqualString(action.feeAmount, order.platformFeeAmountRtm, 'platform_fee_amount')
      assertEqualString(action.feeRecipientAddress, order.platformFeeAddress, 'platform_fee_address')
      assertEqualNumber(action.refundLocktime, order.buyerRefundLocktime, 'buyer_refund_locktime')
      break
    case 'claim_seller_asset':
      assertEqualString(action.fromAddress, order.sellerLockAddress, 'seller_lock_address')
      assertEqualString(action.toAddress, order.buyerAddress, 'buyer_asset_address')
      assertEqualString(action.redeemScriptHex, order.sellerLockRedeemScriptHex, 'seller_lock_redeem_script')
      assertEqualString(action.assetId, order.assetId, 'asset_id')
      assertEqualString(action.qty, order.qty, 'asset_qty')
      assertEqualString(action.secretHash, order.secretHash, 'secret_hash')
      assertEqualNumber(action.refundLocktime, order.sellerRefundLocktime, 'seller_refund_locktime')
      if (order.revealedSecret && action.secret) {
        assertEqualString(action.secret, order.revealedSecret, 'revealed_secret')
      }
      break
    case 'refund_seller_asset':
      assertEqualString(action.fromAddress, order.sellerLockAddress, 'seller_lock_address')
      assertEqualString(action.toAddress, order.sellerAddress, 'seller_refund_address')
      assertEqualString(action.redeemScriptHex, order.sellerLockRedeemScriptHex, 'seller_lock_redeem_script')
      assertEqualString(action.assetId, order.assetId, 'asset_id')
      assertEqualString(action.qty, order.qty, 'asset_qty')
      assertEqualNumber(action.refundLocktime, order.sellerRefundLocktime, 'seller_refund_locktime')
      break
    case 'refund_buyer_rtm':
      assertEqualString(action.fromAddress, order.buyerLockAddress, 'buyer_lock_address')
      assertEqualString(action.toAddress, order.buyerAddress, 'buyer_refund_address')
      assertEqualString(action.redeemScriptHex, order.buyerLockRedeemScriptHex, 'buyer_lock_redeem_script')
      assertEqualString(action.amount, order.priceRtm, 'buyer_refund_amount')
      assertEqualNumber(action.refundLocktime, order.buyerRefundLocktime, 'buyer_refund_locktime')
      break
    default:
      throw new Error('unsupported_rtm_market_action')
  }
}

export function assertRtmMarketActionMatchesListing(action: RtmListingMarketAction, listing: RtmMarketListingSnapshot): void {
  assertEqualString(action.listingId, listing.listingId, 'listing_id')
  if (action.listingDigest || action.orderDigest) {
    assertEqualString(action.listingDigest || action.orderDigest, listing.listingDigest, 'listing_digest')
  }

  switch (action.kind) {
    case 'lock_listing_asset':
      if (!listing.listingLockAddress) throw new Error('listing_lock_address_missing')
      assertEqualString(action.toAddress, listing.listingLockAddress, 'listing_lock_address')
      assertEqualString(action.assetId, listing.assetId, 'asset_id')
      assertEqualString(action.qty, listing.qty, 'asset_qty')
      break
    case 'unlock_listing_asset':
      if (!listing.listingLockAddress) throw new Error('listing_lock_address_missing')
      if (!listing.listingLockRedeemScriptHex) throw new Error('listing_lock_redeem_script_missing')
      if (!listing.listingRefundLocktime) throw new Error('listing_refund_locktime_missing')
      assertEqualString(action.fromAddress, listing.listingLockAddress, 'listing_lock_address')
      assertEqualString(action.toAddress, listing.sellerAddress, 'seller_unlock_address')
      assertEqualString(action.redeemScriptHex, listing.listingLockRedeemScriptHex, 'listing_lock_redeem_script')
      assertEqualString(action.assetId, listing.assetId, 'asset_id')
      assertEqualString(action.qty, listing.qty, 'asset_qty')
      assertEqualString(action.secretHash, listing.secretHash, 'secret_hash')
      assertEqualNumber(action.refundLocktime, listing.listingRefundLocktime, 'listing_refund_locktime')
      if (action.secret) {
        assertSecretMatchesSecretHash(action.secret, listing.secretHash, 'secret')
      }
      break
    case 'refund_listing_asset':
      if (!listing.listingLockAddress) throw new Error('listing_lock_address_missing')
      if (!listing.listingLockRedeemScriptHex) throw new Error('listing_lock_redeem_script_missing')
      if (!listing.listingRefundLocktime) throw new Error('listing_refund_locktime_missing')
      assertEqualString(action.fromAddress, listing.listingLockAddress, 'listing_lock_address')
      assertEqualString(action.toAddress, listing.sellerAddress, 'seller_refund_address')
      assertEqualString(action.redeemScriptHex, listing.listingLockRedeemScriptHex, 'listing_lock_redeem_script')
      assertEqualString(action.assetId, listing.assetId, 'asset_id')
      assertEqualString(action.qty, listing.qty, 'asset_qty')
      assertEqualNumber(action.refundLocktime, listing.listingRefundLocktime, 'listing_refund_locktime')
      break
    default:
      throw new Error('unsupported_rtm_market_listing_action')
  }
}

async function verifyRtmOrderMarketAction(action: RtmOrderMarketAction): Promise<RtmMarketOrderSnapshot> {
  const order = await loadRtmMarketOrder(action.orderId)
  assertRtmMarketActionMatchesOrder(action, order)
  return order
}

async function verifyRtmListingMarketAction(action: RtmListingMarketAction): Promise<RtmMarketListingSnapshot> {
  const listing = await loadRtmMarketListing(action.listingId)
  assertRtmMarketActionMatchesListing(action, listing)
  return listing
}

export async function verifyRtmMarketAction(action: RtmMarketAction): Promise<RtmMarketOrderSnapshot | RtmMarketListingSnapshot> {
  if (isRtmOrderMarketAction(action)) return await verifyRtmOrderMarketAction(action)
  if (isRtmListingMarketAction(action)) return await verifyRtmListingMarketAction(action)
  throw new Error('invalid_rtm_market_action_scope')
}

export async function executeRtmMarketAction(params: {
  action: RtmMarketAction
  rpcConfig: UtxoRpcConfig
  privateKeyHex: string
}): Promise<{ hash: string; signedTxHex?: string }> {
  const action = params.action
  if (action.kind === 'claim_buyer_rtm' || action.kind === 'refund_buyer_rtm') {
    if (!isRtmOrderMarketAction(action)) throw new Error('invalid_rtm_order_market_action_scope')
    const verifiedOrder = await verifyRtmOrderMarketAction(action)
    const lockAddress = String(action.fromAddress || '').trim()
    const toAddress = String(action.toAddress || '').trim()
    const redeemScriptHex = String(action.redeemScriptHex || '').trim()
    if (!lockAddress || !toAddress || !redeemScriptHex) throw new Error('invalid_rtm_coin_htlc_action')
    const utxos = await loadLockUtxos(params.rpcConfig, lockAddress, redeemScriptHex)
    if (utxos.length === 0) throw new Error('no_confirmed_lock_utxos')
    const totalSats = utxos.reduce((sum, utxo) => sum + sat(String(utxo.amount)), 0)
    const feeSats = Math.max(500, (10 + utxos.length * 180 + 34) * 2)
    if (totalSats <= feeSats + DUST_SATS) throw new Error('lock_balance_too_small_after_fee')
    const unsignedInputs = utxos.map((utxo) => ({
      txid: utxo.txid,
      vout: utxo.vout,
      scriptPubKeyHex: String(utxo.scriptPubKey || '').trim(),
      amountSats: sat(String(utxo.amount))
    }))
    const rawHex = action.kind === 'claim_buyer_rtm'
      ? (() => {
          const platformFeeSats = sat(String(action.feeAmount || '0'))
          const sellerPayoutSats = totalSats - feeSats - platformFeeSats
          if (platformFeeSats <= 0) throw new Error('platform_fee_amount_invalid')
          if (sellerPayoutSats <= DUST_SATS) throw new Error('seller_payout_too_small_after_platform_fee')
          return buildUnsignedAddressTransaction(
            unsignedInputs,
            [
              { toAddress, amountSats: sellerPayoutSats },
              { toAddress: String(action.feeRecipientAddress || verifiedOrder.platformFeeAddress || '').trim(), amountSats: platformFeeSats }
            ],
            FINAL_SEQUENCE,
            0
          )
        })()
      : buildUnsignedP2pkhTransaction(
          unsignedInputs,
          toAddress,
          totalSats - feeSats,
          NON_FINAL_SEQUENCE,
          Math.max(1, Math.trunc(Number(action.refundLocktime || 0)))
        )
    const signedTxHex = signRtmHtlcRawTransaction({
      rawHex,
      signingInputs: unsignedInputs,
      redeemScriptHex,
      privHex: params.privateKeyHex,
      mode: action.kind === 'refund_buyer_rtm' ? 'refund' : 'claim',
      secretHex: action.secret,
      refundLocktime: action.refundLocktime
    })
    const hash = await sendRawTransaction(params.rpcConfig, signedTxHex)
    return { hash, signedTxHex }
  }

  if (
    action.kind === 'claim_seller_asset'
    || action.kind === 'refund_seller_asset'
    || action.kind === 'unlock_listing_asset'
    || action.kind === 'refund_listing_asset'
  ) {
    const verified = isRtmOrderMarketAction(action)
      ? await verifyRtmOrderMarketAction(action)
      : isRtmListingMarketAction(action)
      ? await verifyRtmListingMarketAction(action)
      : null
    if (!verified) throw new Error('invalid_rtm_market_action_scope')
    const lockAddress = String(action.fromAddress || '').trim()
    const toAddress = String(action.toAddress || '').trim()
    const redeemScriptHex = String(action.redeemScriptHex || '').trim()
    const assetId = String(action.assetId || '').trim()
    const qty = String(action.qty || '').trim()
    if (!lockAddress || !toAddress || !redeemScriptHex || !assetId || !qty) {
      throw new Error('invalid_rtm_asset_htlc_action')
    }
    const prepared = await prepareRtmAssetNonCustodialTransaction(params.rpcConfig, {
      fromAddress: lockAddress,
      assetId,
      qty,
      toAddress,
      changeAddress: toAddress,
      assetChangeAddress: toAddress,
      feePerByteSats: 2
    })
    const signedTxHex = signRtmHtlcRawTransaction({
      rawHex: prepared.rawHex,
      signingInputs: prepared.signingInputs,
      redeemScriptHex,
      privHex: params.privateKeyHex,
      mode: (action.kind === 'refund_seller_asset' || action.kind === 'refund_listing_asset') ? 'refund' : 'claim',
      secretHex: action.secret,
      refundLocktime: action.refundLocktime
    })
    const hash = await sendRawTransaction(params.rpcConfig, signedTxHex)
    return { hash, signedTxHex }
  }

  throw new Error('unsupported_rtm_market_action_for_local_execution')
}
