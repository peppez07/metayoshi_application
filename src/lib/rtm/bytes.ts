import { sha256 } from '@noble/hashes/sha256'
import { ripemd160 } from '@noble/hashes/ripemd160'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils'

export { bytesToHex, hexToBytes }

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

export function reverseBytes(bytes: Uint8Array): Uint8Array {
  return Uint8Array.from(bytes).reverse()
}

export function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false
  return true
}

export function sha256d(data: Uint8Array): Uint8Array {
  return sha256(sha256(data))
}

export function hash160(data: Uint8Array): Uint8Array {
  return ripemd160(sha256(data))
}

export function u16LE(n: number): Uint8Array {
  const out = new Uint8Array(2)
  new DataView(out.buffer).setUint16(0, n, true)
  return out
}

export function u32LE(n: number): Uint8Array {
  const out = new Uint8Array(4)
  new DataView(out.buffer).setUint32(0, n >>> 0, true)
  return out
}

export function u64LE(n: bigint): Uint8Array {
  if (n < 0n || n >= 1n << 64n) throw new Error('u64 out of range')
  const out = new Uint8Array(8)
  new DataView(out.buffer).setBigUint64(0, n, true)
  return out
}

export function i64LE(n: bigint): Uint8Array {
  if (n < -(1n << 63n) || n >= 1n << 63n) throw new Error('i64 out of range')
  const out = new Uint8Array(8)
  new DataView(out.buffer).setBigInt64(0, n, true)
  return out
}

/** Bitcoin CompactSize. */
export function compactSize(n: number): Uint8Array {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error('Invalid CompactSize')
  if (n < 0xfd) return Uint8Array.of(n)
  if (n <= 0xffff) return concatBytes(Uint8Array.of(0xfd), u16LE(n))
  if (n <= 0xffffffff) return concatBytes(Uint8Array.of(0xfe), u32LE(n))
  return concatBytes(Uint8Array.of(0xff), u64LE(BigInt(n)))
}

export function varBytes(data: Uint8Array): Uint8Array {
  return concatBytes(compactSize(data.length), data)
}

/** Minimal script push for data up to 255 bytes. */
export function pushData(data: Uint8Array): Uint8Array {
  if (data.length < 0x4c) return concatBytes(Uint8Array.of(data.length), data)
  if (data.length <= 0xff) return concatBytes(Uint8Array.of(0x4c, data.length), data)
  throw new Error('Push data too large')
}

export function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

/** Sequential reader matching Core's deserialization rules. */
export class ByteReader {
  cursor = 0

  constructor(readonly data: Uint8Array) {}

  take(size: number): Uint8Array {
    const end = this.cursor + size
    if (size < 0 || end > this.data.length) throw new Error('Truncated data')
    const value = this.data.slice(this.cursor, end)
    this.cursor = end
    return value
  }

  u8(): number {
    return this.take(1)[0]
  }

  u16(): number {
    return new DataView(this.take(2).buffer).getUint16(0, true)
  }

  u32(): number {
    return new DataView(this.take(4).buffer).getUint32(0, true)
  }

  u64(): bigint {
    return new DataView(this.take(8).buffer).getBigUint64(0, true)
  }

  i64(): bigint {
    return new DataView(this.take(8).buffer).getBigInt64(0, true)
  }

  compactSize(): number {
    const first = this.u8()
    if (first < 0xfd) return first
    let value: number
    let minimum: number
    if (first === 0xfd) {
      value = this.u16()
      minimum = 0xfd
    } else if (first === 0xfe) {
      value = this.u32()
      minimum = 0x10000
    } else {
      const big = this.u64()
      if (big > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('CompactSize too large')
      value = Number(big)
      minimum = 0x100000000
    }
    if (value < minimum) throw new Error('Non-minimal CompactSize')
    return value
  }

  varBytes(): Uint8Array {
    return this.take(this.compactSize())
  }

  get remaining(): number {
    return this.data.length - this.cursor
  }
}
