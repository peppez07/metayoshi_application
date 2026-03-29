import fs from 'node:fs/promises'
import path from 'node:path'
import * as secp from '@noble/secp256k1'
import { hexToBytes } from '@noble/hashes/utils'
import { sha256 } from '@noble/hashes/sha256'
import { hmac } from '@noble/hashes/hmac'
import { deriveUtxoAddress } from '../src/lib/utxoAddress'

if (!secp.hashes.sha256) secp.hashes.sha256 = (msg: Uint8Array) => sha256(msg)
if (!secp.hashes.hmacSha256) secp.hashes.hmacSha256 = (key: Uint8Array, msg: Uint8Array) => hmac(sha256, key, msg)

function concatBytes(...arrs: Uint8Array[]) {
  const len = arrs.reduce((n, arr) => n + arr.length, 0)
  const out = new Uint8Array(len)
  let offset = 0
  for (const arr of arrs) {
    out.set(arr, offset)
    offset += arr.length
  }
  return out
}

function encodeVarInt(value: number) {
  if (value < 253) return Uint8Array.of(value)
  if (value <= 0xffff) return Uint8Array.of(253, value & 0xff, (value >> 8) & 0xff)
  throw new Error('message_too_long')
}

function buildRtmMessageDigest(message: string) {
  const prefix = new TextEncoder().encode('Raptoreum Signed Message:\n')
  const body = new TextEncoder().encode(String(message || ''))
  return sha256(sha256(concatBytes(encodeVarInt(prefix.length), prefix, encodeVarInt(body.length), body)))
}

function toBase64(value: Uint8Array) {
  return Buffer.from(value).toString('base64')
}

async function signRtmMessage(mnemonic: string, message: string, address: string) {
  const derived = await deriveUtxoAddress(mnemonic, 'RTM', 0, 0, 0)
  if (derived.address !== address) throw new Error('derived_address_mismatch')
  const digest = buildRtmMessageDigest(message)
  const recovered = secp.sign(digest, hexToBytes(derived.privHex), { prehash: false, lowS: true, format: 'recovered' })
  const parsed = secp.Signature.fromBytes(recovered, 'recovered')
  if (typeof parsed.recovery !== 'number') throw new Error('recovery_id_missing')
  const compact = parsed.toBytes('compact')
  const header = Uint8Array.of(27 + parsed.recovery + 4)
  return toBase64(concatBytes(header, compact))
}

async function fetchJson(url: string, init: RequestInit = {}) {
  const response = await fetch(url, init)
  const text = await response.text().catch(() => '')
  let body: any = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  return { ok: response.ok, status: response.status, body, text }
}

function extractMnemonic(raw: string) {
  const match = raw.match(/\b([a-z]+(?:\s+[a-z]+){11})\b/)
  if (!match) throw new Error('mnemonic_not_found_in_envfromwallet_a')
  return match[1].trim().toLowerCase().replace(/\s+/g, ' ')
}

const apiBase = 'https://api.metayoshi.app'
const envFile = path.resolve('..', '..', 'server_website_metayoshi', 'envfromwallet_a')
const raw = await fs.readFile(envFile, 'utf8')
const mnemonic = extractMnemonic(raw)
const seller = await deriveUtxoAddress(mnemonic, 'RTM', 0, 0, 0)

const challenge = await fetchJson(`${apiBase}/v1/auth/challenge`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ address: seller.address })
})
if (!challenge.ok) throw new Error(`auth_challenge_failed:${challenge.status}:${challenge.text}`)

const signature = await signRtmMessage(mnemonic, String(challenge.body?.message || ''), seller.address)
const verify = await fetchJson(`${apiBase}/v1/auth/verify`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    address: seller.address,
    nonce: String(challenge.body?.nonce || ''),
    signature,
    addressKind: 'rtm',
    networkId: 'raptoreum'
  })
})
if (!verify.ok) throw new Error(`auth_verify_failed:${verify.status}:${verify.text}`)
const sessionToken = String(verify.body?.sessionToken || '').trim()
if (!sessionToken) throw new Error('session_token_missing')

const dashboard = await fetchJson(`${apiBase}/v1/market/rtm/dashboard/${encodeURIComponent(seller.address)}`, {
  headers: { Authorization: `Bearer ${sessionToken}` }
})
if (!dashboard.ok) throw new Error(`dashboard_failed:${dashboard.status}:${dashboard.text}`)

const listings = Array.isArray(dashboard.body?.seller?.listings) ? dashboard.body.seller.listings : []
const petestListings = listings.filter((entry: any) => String(entry.assetId || '').trim() === 'PETEST')

let latestDetail: any = null
if (petestListings.length > 0) {
  const latest = petestListings[0]
  const detail = await fetchJson(`${apiBase}/v1/market/rtm/listings/${encodeURIComponent(String(latest.listingId || ''))}`)
  latestDetail = detail.body
}

console.log(JSON.stringify({
  sellerAddress: seller.address,
  petestListings,
  latestPetestDetail: latestDetail
}, null, 2))
