/**
 * Bech32 (BIP173) and Bech32m (BIP350) SegWit address decoding and encoding.
 * Witness version 0 uses Bech32; versions 1–16 use Bech32m.
 */
const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'
const BECH32_CONST = 1
const BECH32M_CONST = 0x2bc830a3

function polymod(values: number[]): number {
  const generators = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3]
  let chk = 1
  for (const value of values) {
    const top = chk >>> 25
    chk = ((chk & 0x1ffffff) << 5) ^ value
    for (let i = 0; i < 5; i += 1) if ((top >>> i) & 1) chk ^= generators[i]
  }
  return chk >>> 0
}

function hrpExpand(hrp: string): number[] {
  const out: number[] = []
  for (let i = 0; i < hrp.length; i += 1) out.push(hrp.charCodeAt(i) >> 5)
  out.push(0)
  for (let i = 0; i < hrp.length; i += 1) out.push(hrp.charCodeAt(i) & 31)
  return out
}

function convertBits(data: number[], from: number, to: number, pad: boolean): number[] | null {
  let acc = 0
  let bits = 0
  const out: number[] = []
  const maxv = (1 << to) - 1
  for (const value of data) {
    if (value < 0 || value >> from) return null
    acc = (acc << from) | value
    bits += from
    while (bits >= to) {
      bits -= to
      out.push((acc >> bits) & maxv)
    }
  }
  if (pad) {
    if (bits) out.push((acc << (to - bits)) & maxv)
  } else if (bits >= from || ((acc << (to - bits)) & maxv)) {
    return null
  }
  return out
}

export interface WitnessProgram {
  version: number
  program: Uint8Array
}

/** Decodes a SegWit address for `hrp`; null for anything invalid. */
export function decodeSegwitAddress(hrp: string, address: string): WitnessProgram | null {
  const text = String(address || '').trim()
  if (text.length < 8 || text.length > 90) return null
  if (text !== text.toLowerCase() && text !== text.toUpperCase()) return null
  const lower = text.toLowerCase()
  const separator = lower.lastIndexOf('1')
  if (separator < 1 || separator + 7 > lower.length) return null
  if (lower.slice(0, separator) !== hrp.toLowerCase()) return null
  const data: number[] = []
  for (const char of lower.slice(separator + 1)) {
    const value = CHARSET.indexOf(char)
    if (value < 0) return null
    data.push(value)
  }
  const check = polymod([...hrpExpand(lower.slice(0, separator)), ...data])
  const version = data[0]
  if (version > 16) return null
  if (check !== (version === 0 ? BECH32_CONST : BECH32M_CONST)) return null
  const program = convertBits(data.slice(1, -6), 5, 8, false)
  if (!program || program.length < 2 || program.length > 40) return null
  if (version === 0 && program.length !== 20 && program.length !== 32) return null
  return { version, program: Uint8Array.from(program) }
}

export function encodeSegwitAddress(hrp: string, version: number, program: Uint8Array): string {
  const data = [version, ...convertBits(Array.from(program), 8, 5, true)!]
  const values = [...hrpExpand(hrp), ...data, 0, 0, 0, 0, 0, 0]
  const mod = polymod(values) ^ (version === 0 ? BECH32_CONST : BECH32M_CONST)
  const checksum = Array.from({ length: 6 }, (_, i) => (mod >>> (5 * (5 - i))) & 31)
  return `${hrp}1${[...data, ...checksum].map((v) => CHARSET[v]).join('')}`
}

/** scriptPubKey: OP_version <program>. */
export function witnessScript(witness: WitnessProgram): Uint8Array {
  const opcode = witness.version === 0 ? 0x00 : 0x50 + witness.version
  return Uint8Array.from([opcode, witness.program.length, ...witness.program])
}
