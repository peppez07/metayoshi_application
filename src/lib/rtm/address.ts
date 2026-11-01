import * as bip39 from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import { HDKey } from '@scure/bip32'
import { getPublicKey } from '@noble/secp256k1'
import { sha256 } from '@noble/hashes/sha256'
import bs58 from 'bs58'
import { bytesToHex, concatBytes, equalBytes, hash160, reverseBytes, sha256d } from './bytes'
import { RTM_NETWORK, type NetworkParams } from '../networks'
import { decodeSegwitAddress, witnessScript } from '../coins/bech32'

/** Raptoreum mainnet parameters (Core chainparams / ElectrumX coins.Raptoreum). */
export const RTM = {
  symbol: 'RTM',
  decimals: 8,
  bip44CoinType: 175,
  p2pkhVersion: 0x3c,
  p2shVersion: 0x10,
  wifVersion: 0x80
} as const

export const COIN = 100_000_000n

export type AddressKind = 'p2pkh' | 'p2sh' | 'witness'

export interface DecodedAddress {
  kind: AddressKind
  /** Key or script hash; for 'witness' the witness program. */
  hash: Uint8Array
  /** SegWit version, only for 'witness'. */
  witnessVersion?: number
}

export interface DerivedKey {
  address: string
  pubkey: Uint8Array
  privateKey: Uint8Array
}

function base58CheckEncode(payload: Uint8Array): string {
  return bs58.encode(concatBytes(payload, sha256d(payload).slice(0, 4)))
}

function base58CheckDecode(text: string): Uint8Array | null {
  let raw: Uint8Array
  try {
    raw = bs58.decode(text)
  } catch {
    return null
  }
  if (raw.length < 5) return null
  const payload = raw.slice(0, -4)
  return equalBytes(raw.slice(-4), sha256d(payload).slice(0, 4)) ? payload : null
}

export function pubkeyToAddress(pubkey: Uint8Array, network: NetworkParams = RTM_NETWORK): string {
  return base58CheckEncode(concatBytes(network.p2pkhPrefix, hash160(pubkey)))
}

/** Decodes a transparent P2PKH/P2SH address of `network` (RTM by default). */
export function decodeAddress(address: string, network: NetworkParams = RTM_NETWORK): DecodedAddress | null {
  const payload = base58CheckDecode(String(address || '').trim())
  const prefixLength = network.p2pkhPrefix.length
  if (payload && payload.length === prefixLength + 20) {
    const prefix = payload.slice(0, prefixLength)
    if (equalBytes(prefix, network.p2pkhPrefix)) return { kind: 'p2pkh', hash: payload.slice(prefixLength) }
    if (network.p2shPrefixes.some((p2sh) => equalBytes(prefix, p2sh))) return { kind: 'p2sh', hash: payload.slice(prefixLength) }
    return null
  }
  if (!payload && network.bech32Hrp) {
    const witness = decodeSegwitAddress(network.bech32Hrp, address)
    if (witness) return { kind: 'witness', hash: witness.program, witnessVersion: witness.version }
  }
  return null
}

export function isValidAddress(address: string, network: NetworkParams = RTM_NETWORK): boolean {
  return decodeAddress(address, network) !== null
}

export function addressToScript(address: string, network: NetworkParams = RTM_NETWORK): Uint8Array {
  const decoded = decodeAddress(address, network)
  if (!decoded) throw new Error(`Invalid ${network.symbol} address: ${address}`)
  if (decoded.kind === 'p2pkh') {
    return concatBytes(Uint8Array.of(0x76, 0xa9, 0x14), decoded.hash, Uint8Array.of(0x88, 0xac))
  }
  if (decoded.kind === 'witness') return witnessScript({ version: decoded.witnessVersion ?? 0, program: decoded.hash })
  return concatBytes(Uint8Array.of(0xa9, 0x14), decoded.hash, Uint8Array.of(0x87))
}

/** Electrum protocol script hash: reversed SHA-256 of the output script, hex encoded. */
export function scriptHash(script: Uint8Array): string {
  return bytesToHex(reverseBytes(sha256(script)))
}

export function addressToScriptHash(address: string, network: NetworkParams = RTM_NETWORK): string {
  return scriptHash(addressToScript(address, network))
}

export function privateKeyToWif(privateKey: Uint8Array, network: NetworkParams = RTM_NETWORK): string {
  return base58CheckEncode(concatBytes(Uint8Array.of(network.wifVersion), privateKey, Uint8Array.of(0x01)))
}

export function normalizeMnemonic(mnemonic: string): string {
  return String(mnemonic || '').trim().toLowerCase().split(/\s+/).join(' ')
}

export function generateMnemonic(strength: 128 | 256 = 128): string {
  return bip39.generateMnemonic(wordlist, strength)
}

export function isValidMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(normalizeMnemonic(mnemonic), wordlist)
}

/**
 * BIP44 path: m/44'/175'/{account}'/0/0 for RTM (every MetaYoshi release),
 * m/44'/177'/{account}'/0/0 for BitcoinZ (SLIP-44 coin type 177).
 */
export function derivationPath(accountIndex: number, network: NetworkParams = RTM_NETWORK): string {
  if (!Number.isInteger(accountIndex) || accountIndex < 0) throw new Error('Invalid account index')
  return `m/44'/${network.bip44CoinType}'/${accountIndex}'/0/0`
}

const seedCache = new Map<string, Uint8Array>()

// Seeds use the stored phrase as-is (trimmed) so existing vaults keep their
// addresses; new phrases are normalized before they are stored.
async function mnemonicSeed(mnemonic: string): Promise<Uint8Array> {
  const normalized = String(mnemonic || '').trim()
  const cached = seedCache.get(normalized)
  if (cached) return cached
  const seed = await bip39.mnemonicToSeed(normalized)
  seedCache.clear()
  seedCache.set(normalized, seed)
  return seed
}

export function clearSeedCache(): void {
  seedCache.clear()
}

export async function deriveAccountKey(mnemonic: string, accountIndex: number, network: NetworkParams = RTM_NETWORK): Promise<DerivedKey> {
  const root = HDKey.fromMasterSeed(await mnemonicSeed(mnemonic))
  const child = root.derive(derivationPath(accountIndex, network))
  if (!child.privateKey) throw new Error('Failed to derive private key')
  const pubkey = getPublicKey(child.privateKey, true)
  return { address: pubkeyToAddress(pubkey, network), pubkey, privateKey: child.privateKey }
}
