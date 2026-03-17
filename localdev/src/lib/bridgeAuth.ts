const ROTATION_TAG = 'metayoshi-bridge-tx-v1'
const DEFAULT_ROTATE_BY_DATE = true
const DEFAULT_ACCEPT_SKEW_DAYS = 1

type BridgeTxAuthConfig = {
  secret: string
  rotateByDate: boolean
}

function utcDateStamp(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date.getTime())
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes)
  const hash = new Uint8Array(hashBuffer)
  return Array.from(hash, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function normalizeSecret(value: unknown): string {
  return String(value ?? '').trim()
}

function parseBooleanLike(value: unknown, fallback: boolean): boolean {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized) return fallback
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return fallback
}

function getBuildTimeBridgeTxAuthConfig(): BridgeTxAuthConfig {
  return {
    secret: normalizeSecret(import.meta.env.VITE_BRIDGE_TX_AUTH_KEY),
    rotateByDate: parseBooleanLike(import.meta.env.VITE_BRIDGE_TX_AUTH_ROTATE_BY_DATE, DEFAULT_ROTATE_BY_DATE)
  }
}

export async function resolveBridgeTxKey(): Promise<string | undefined> {
  const keys = await resolveBridgeTxKeyCandidates()
  return keys[0]
}

export async function resolveBridgeTxKeyCandidates(
  options: { fallbackSecret?: string } = {}
): Promise<string[]> {
  const config = getBuildTimeBridgeTxAuthConfig()
  const primarySecret = normalizeSecret(config.secret)
  const fallbackSecret = normalizeSecret(options.fallbackSecret)
  const secrets = Array.from(new Set([primarySecret, fallbackSecret].filter(Boolean)))
  if (secrets.length === 0) return []

  const rotateByDate = config.rotateByDate
  const skewDaysRaw = Number(import.meta.env.VITE_BRIDGE_TX_AUTH_ACCEPT_SKEW_DAYS ?? DEFAULT_ACCEPT_SKEW_DAYS)
  const skewDays = Number.isFinite(skewDaysRaw)
    ? Math.max(0, Math.min(7, Math.trunc(skewDaysRaw)))
    : DEFAULT_ACCEPT_SKEW_DAYS

  const now = new Date()
  const out: string[] = []

  for (const secret of secrets) {
    if (!rotateByDate) {
      out.push(secret)
    }

    for (let offset = -skewDays; offset <= skewDays; offset += 1) {
      const stamp = utcDateStamp(addUtcDays(now, offset))
      const derived = await sha256Hex(`${ROTATION_TAG}|${stamp}|${secret}`)
      out.push(derived)
    }

    if (rotateByDate) {
      // Fallback if server rotation is disabled but client assumes rotation.
      out.push(secret)
    }
  }

  return Array.from(new Set(out.filter(Boolean)))
}
