export const DAPP_PERMISSIONS_STORAGE_KEY = 'metayoshi-dapp-permissions-v1'
export const DAPP_PENDING_APPROVAL_STORAGE_KEY = 'metayoshi-dapp-pending-approval-v1'
export const DAPP_PENDING_REQUEST_STORAGE_KEY = 'metayoshi-dapp-pending-request-v1'
export const DAPP_APPROVAL_TIMEOUT_MS = 2 * 60 * 1000

export type DappScope = 'read' | 'sign' | 'send_coin' | 'send_asset'
export type DappApprovalStatus = 'pending' | 'approved' | 'rejected'
export type DappRequestStatus = 'pending' | 'approved' | 'rejected' | 'executed' | 'failed'

export interface DappPermission {
  origin: string
  scopes: DappScope[]
  updatedAt: number
  lastConnectedAt?: number
}

export interface DappPendingApproval {
  id: string
  origin: string
  scopes: DappScope[]
  status: DappApprovalStatus
  requestedAt: number
  updatedAt: number
  expiresAt: number
}

export interface DappSendRequestPayload {
  to: string
  amount: string
}

export interface DappSendAssetRequestPayload {
  assetId: string
  qty: string
  toAddress: string
}

export interface DappRequestError {
  code: number
  message: string
}

export interface DappRequestResult {
  hash: string
  txid: string
}

export interface DappPendingRequest {
  id: string
  origin: string
  method: 'wallet_sendTransaction' | 'wallet_sendAsset'
  networkId: string
  accountId: string
  request: DappSendRequestPayload | DappSendAssetRequestPayload
  status: DappRequestStatus
  requestedAt: number
  updatedAt: number
  expiresAt: number
  result?: DappRequestResult
  error?: DappRequestError
}

const VALID_SCOPES: DappScope[] = ['read', 'sign', 'send_coin', 'send_asset']

function isDappScope(value: unknown): value is DappScope {
  return VALID_SCOPES.includes(value as DappScope)
}

export function normalizeDappOrigin(input: string): string {
  const value = String(input || '').trim()
  if (!value) return 'unknown'
  if (value === 'null') return 'unknown'
  if (value.startsWith('chrome-extension://')) return value

  try {
    return new URL(value).origin
  } catch {
    return value.toLowerCase()
  }
}

export function uniqDappScopes(scopes: readonly DappScope[]): DappScope[] {
  const unique = new Set<DappScope>()
  for (const scope of scopes) {
    if (isDappScope(scope)) unique.add(scope)
  }
  return Array.from(unique)
}

export function parseDappPermissions(raw: unknown): Record<string, DappPermission> {
  if (!raw || typeof raw !== 'object') return {}

  const out: Record<string, DappPermission> = {}
  const entries = Object.entries(raw as Record<string, unknown>)
  for (const [key, value] of entries) {
    if (!value || typeof value !== 'object') continue
    const candidate = value as Partial<DappPermission>
    const origin = normalizeDappOrigin(typeof candidate.origin === 'string' ? candidate.origin : key)
    const scopes = Array.isArray(candidate.scopes)
      ? uniqDappScopes(candidate.scopes.filter(isDappScope))
      : []
    if (!origin || scopes.length === 0) continue
    out[origin] = {
      origin,
      scopes,
      updatedAt: typeof candidate.updatedAt === 'number' ? candidate.updatedAt : Date.now(),
      lastConnectedAt: typeof candidate.lastConnectedAt === 'number' ? candidate.lastConnectedAt : undefined
    }
  }

  return out
}

export function parseDappPendingApproval(raw: unknown): DappPendingApproval | null {
  if (!raw || typeof raw !== 'object') return null
  const candidate = raw as Partial<DappPendingApproval>
  if (typeof candidate.id !== 'string' || !candidate.id.trim()) return null

  const origin = normalizeDappOrigin(String(candidate.origin || ''))
  const scopes = Array.isArray(candidate.scopes)
    ? uniqDappScopes(candidate.scopes.filter(isDappScope))
    : []
  if (!origin || origin === 'unknown' || scopes.length === 0) return null

  const status: DappApprovalStatus = candidate.status === 'approved' || candidate.status === 'rejected'
    ? candidate.status
    : 'pending'

  const now = Date.now()
  const requestedAt = typeof candidate.requestedAt === 'number' ? candidate.requestedAt : now
  const updatedAt = typeof candidate.updatedAt === 'number' ? candidate.updatedAt : requestedAt
  const expiresAt = typeof candidate.expiresAt === 'number' ? candidate.expiresAt : requestedAt + DAPP_APPROVAL_TIMEOUT_MS

  return {
    id: candidate.id,
    origin,
    scopes,
    status,
    requestedAt,
    updatedAt,
    expiresAt
  }
}

function parseDappRequestStatus(raw: unknown): DappRequestStatus {
  if (raw === 'approved' || raw === 'rejected' || raw === 'executed' || raw === 'failed') {
    return raw
  }
  return 'pending'
}

function parseDappSendRequest(raw: unknown): DappSendRequestPayload | null {
  if (!raw || typeof raw !== 'object') return null
  const candidate = raw as Partial<DappSendRequestPayload>
  const to = String(candidate.to || '').trim()
  const amount = String(candidate.amount || '').trim()
  if (!to || !amount) return null
  return { to, amount }
}

function parseDappSendAssetRequest(raw: unknown): DappSendAssetRequestPayload | null {
  if (!raw || typeof raw !== 'object') return null
  const candidate = raw as Partial<DappSendAssetRequestPayload>
  const assetId = String(candidate.assetId || '').trim()
  const qty = String(candidate.qty || '').trim()
  const toAddress = String(candidate.toAddress || '').trim()
  if (!assetId || !qty || !toAddress) return null
  return { assetId, qty, toAddress }
}

function parseDappRequestError(raw: unknown): DappRequestError | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const candidate = raw as Partial<DappRequestError>
  const code = typeof candidate.code === 'number' ? candidate.code : -32603
  const message = String(candidate.message || '').trim()
  if (!message) return undefined
  return { code, message }
}

function parseDappRequestResult(raw: unknown): DappRequestResult | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const candidate = raw as Partial<DappRequestResult>
  const hash = String(candidate.hash || '').trim()
  const txid = String(candidate.txid || hash).trim()
  if (!hash || !txid) return undefined
  return { hash, txid }
}

export function parseDappPendingRequest(raw: unknown): DappPendingRequest | null {
  if (!raw || typeof raw !== 'object') return null
  const candidate = raw as Partial<DappPendingRequest>

  const id = String(candidate.id || '').trim()
  if (!id) return null
  const origin = normalizeDappOrigin(String(candidate.origin || ''))
  if (!origin || origin === 'unknown') return null
  const method = String(candidate.method || '').trim()
  if (method !== 'wallet_sendTransaction' && method !== 'wallet_sendAsset') return null

  const networkId = String(candidate.networkId || '').trim()
  const accountId = String(candidate.accountId || '').trim()
  if (!networkId || !accountId) return null

  const request = method === 'wallet_sendAsset'
    ? parseDappSendAssetRequest(candidate.request)
    : parseDappSendRequest(candidate.request)
  if (!request) return null

  const now = Date.now()
  const requestedAt = typeof candidate.requestedAt === 'number' ? candidate.requestedAt : now
  const updatedAt = typeof candidate.updatedAt === 'number' ? candidate.updatedAt : requestedAt
  const expiresAt = typeof candidate.expiresAt === 'number' ? candidate.expiresAt : requestedAt + DAPP_APPROVAL_TIMEOUT_MS

  return {
    id,
    origin,
    method: method as 'wallet_sendTransaction' | 'wallet_sendAsset',
    networkId,
    accountId,
    request,
    status: parseDappRequestStatus(candidate.status),
    requestedAt,
    updatedAt,
    expiresAt,
    result: parseDappRequestResult(candidate.result),
    error: parseDappRequestError(candidate.error)
  }
}
