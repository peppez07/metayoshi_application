import { HDKey } from '@scure/bip32'
import { mnemonicToSeedSync } from '@scure/bip39'
import { bech32 } from '@scure/base'
import { sha256 } from '@noble/hashes/sha256'
import { ripemd160 } from '@noble/hashes/ripemd160'
import { bytesToHex } from '@noble/hashes/utils'
import { getPublicKey } from '@noble/secp256k1'

export interface CosmosAddressResult {
  path: string
  address: string
  pubHex: string
  privHex: string
}

const CRO_COIN_TYPE = 394
const CRO_HRP = 'cro'

function toCosmosAddress(hrp: string, compressedPubKey: Uint8Array): string {
  const sha = sha256(compressedPubKey)
  const hash160 = ripemd160(sha)
  return bech32.encode(hrp, bech32.toWords(hash160))
}

export async function deriveCosmosAddress(
  mnemonic: string,
  accountIndex = 0,
  opts?: { hrp?: string; coinType?: number }
): Promise<CosmosAddressResult> {
  const hrp = String(opts?.hrp || CRO_HRP).trim() || CRO_HRP
  const coinType = Number.isInteger(opts?.coinType) ? Number(opts?.coinType) : CRO_COIN_TYPE
  const path = `m/44'/${coinType}'/${accountIndex}'/0/0`
  const seed = mnemonicToSeedSync(mnemonic.trim())
  const root = HDKey.fromMasterSeed(seed)
  const child = root.derive(path)
  if (!child.privateKey) throw new Error('Failed to derive Cosmos private key')
  const compressedPub = getPublicKey(child.privateKey, true)
  const address = toCosmosAddress(hrp, compressedPub)
  return {
    path,
    address,
    pubHex: bytesToHex(compressedPub),
    privHex: bytesToHex(child.privateKey)
  }
}

export function isCroCosmosAddress(value: string): boolean {
  const input = String(value || '').trim()
  if (!input) return false
  try {
    const decoded = bech32.decode(input as `${string}1${string}`)
    return decoded.prefix === CRO_HRP && decoded.words.length > 0
  } catch {
    return false
  }
}
