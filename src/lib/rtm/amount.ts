/** Exact decimal <-> atomic unit conversion. Never routes amounts through floats. */

export function parseUnits(text: string, decimals: number, label = 'Amount'): bigint {
  const value = String(text ?? '').trim()
  if (!/^\d+(\.\d+)?$/.test(value)) throw new Error(`${label} must be a positive decimal number`)
  const [whole, fraction = ''] = value.split('.')
  if (fraction.length > decimals) {
    throw new Error(`${label} supports at most ${decimals} decimal place${decimals === 1 ? '' : 's'}`)
  }
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, '0') || '0')
}

export function formatUnits(atoms: bigint | string | number, decimals: number): string {
  let value = BigInt(atoms)
  const negative = value < 0n
  if (negative) value = -value
  const base = 10n ** BigInt(decimals)
  const whole = value / base
  const fraction = (value % base).toString().padStart(decimals, '0').replace(/0+$/, '')
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`
}

/** Parses the server's atomic decimal strings (and plain integers). */
export function toAtoms(value: unknown): bigint {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new Error('Unsafe integer amount')
    return BigInt(value)
  }
  const text = String(value ?? '').trim()
  if (!/^-?\d+$/.test(text)) throw new Error(`Invalid atomic amount: ${text}`)
  return BigInt(text)
}
