// Background service worker: routes dApp requests to the popup, which holds
// the keys and the ElectrumX connection. This worker never signs anything.

import {
  clearRuntimeErrorLog,
  getRuntimeErrorLog,
  installGlobalErrorMonitor,
  recordRuntimeError
} from '../lib/runtimeErrorMonitor'
import {
  DAPP_APPROVAL_TIMEOUT_MS,
  DAPP_PENDING_APPROVAL_STORAGE_KEY,
  DAPP_PENDING_REQUEST_STORAGE_KEY,
  DAPP_PERMISSIONS_STORAGE_KEY,
  normalizeDappOrigin,
  parseDappPendingApproval,
  parseDappPendingRequest,
  parseDappPermissions,
  uniqDappScopes,
  type DappPendingApproval,
  type DappPendingRequest,
  type DappPermission,
  type DappRequestError,
  type DappRequestResult,
  type DappScope
} from '../lib/dappPermissions'
import { isPersistedStateEnvelope, unwrapPersistedState, WALLET_STORAGE_KEY } from '../lib/walletStorage'
import { SIDE_PANEL_PORT_PREFIX } from '../lib/surface'

const BG_EVENT_PORT_NAME = 'metayoshi-inpage-events'
const APP_POPUP_WIDTH = 380
const APP_POPUP_HEIGHT = 640
const APP_POPUP_MAX_HEIGHT = 700
const APP_ENTRY_PATH = 'app/src/ui/index.html'
const RTM_DECIMALS = 8
const managedPopupWindowIds = new Set<number>()
let managedPopupWindowId: number | null = null
let managedPopupOpenQueue: Promise<void> = Promise.resolve()

type JsonRpcRequest = {
  id?: string | number | null
  jsonrpc?: '2.0'
  method: string
  params?: unknown
}

type JsonRpcResponse = {
  jsonrpc: '2.0'
  id: string | number | null
  result?: unknown
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

type DappRequest = {
  type: 'DAPP_INTERNAL_RPC'
  request: JsonRpcRequest
  origin?: string
}

type MonitorRequest =
  | { type: 'METAYOSHI_MONITOR_GET_ERRORS' }
  | { type: 'METAYOSHI_MONITOR_CLEAR_ERRORS' }

type SendTransactionParams = {
  to: string
  amount: string
}

type SendAssetParams = {
  assetId: string
  qty: string
  toAddress: string
}

const PROVIDER_STATE_METHODS = new Set(['wallet_getProviderState', 'metayoshi_getProviderState', 'rtm_getProviderState'])
const CONNECT_METHODS = new Set(['wallet_connect', 'metayoshi_connect', 'rtm_connect'])
const CAPABILITIES_METHODS = new Set(['wallet_getCapabilities', 'metayoshi_getCapabilities', 'rtm_getCapabilities'])
const NETWORKS_METHODS = new Set(['wallet_getNetworks', 'metayoshi_getNetworks', 'rtm_getNetworks'])
const REQUEST_ACCOUNTS_METHODS = new Set(['wallet_requestAccounts', 'metayoshi_requestAccounts', 'rtm_requestAccounts'])
const ACCOUNTS_METHODS = new Set(['wallet_accounts', 'metayoshi_accounts', 'rtm_accounts'])
const SIGN_MESSAGE_METHODS = new Set(['wallet_signMessage', 'metayoshi_signMessage', 'rtm_signMessage'])
const SEND_TRANSACTION_METHODS = new Set(['wallet_sendTransaction', 'metayoshi_sendTransaction', 'rtm_sendTransaction'])
const SEND_ASSET_METHODS = new Set(['wallet_sendAsset', 'metayoshi_sendAsset', 'rtm_sendAsset'])
const SELECT_ACCOUNT_METHODS = new Set(['wallet_selectAccount', 'metayoshi_selectAccount', 'rtm_selectAccount'])
const DAPP_SDK_METHODS = [
  ...PROVIDER_STATE_METHODS,
  ...REQUEST_ACCOUNTS_METHODS,
  ...ACCOUNTS_METHODS,
  ...CONNECT_METHODS,
  ...SELECT_ACCOUNT_METHODS,
  ...NETWORKS_METHODS,
  ...CAPABILITIES_METHODS,
  ...SEND_TRANSACTION_METHODS,
  ...SEND_ASSET_METHODS
]

/** The single network this wallet serves. */
const RTM_NETWORK = {
  id: 'rtm',
  name: 'Raptoreum',
  symbol: 'RTM',
  coinType: 'UTXO',
  decimals: RTM_DECIMALS,
  capabilities: { nativeSend: true, assetLayer: true, assetSend: true, activity: true }
} as const

// Event ports for broadcasting events to content scripts
const eventPorts = new Set<chrome.runtime.Port>()

/** The subset of the popup's persisted store that this worker reads. */
interface WalletState {
  isInitialized?: boolean
  isLocked?: boolean
  hasVault?: boolean
  accounts?: Array<{ id: string; address?: string }>
  activeAccountId?: string | null
  authorizedSites?: string[]
}

installGlobalErrorMonitor('background-sw')

function createDefaultWalletState(): WalletState {
  return {
    isInitialized: false,
    isLocked: true,
    hasVault: false,
    accounts: [],
    activeAccountId: null,
    authorizedSites: []
  }
}

async function getWalletStorageRecord(): Promise<unknown> {
  try {
    const stored = await chrome.storage.local.get(WALLET_STORAGE_KEY)
    return stored[WALLET_STORAGE_KEY]
  } catch {
    return null
  }
}

function normalizeAuthorizedSites(rawSites: unknown): string[] {
  if (!Array.isArray(rawSites)) return []
  return Array.from(
    new Set(
      rawSites
        .map((site) => normalizeDappOrigin(String(site || '')))
        .filter((site) => site && site !== 'unknown')
    )
  )
}

async function getWalletState(): Promise<WalletState> {
  const raw = await getWalletStorageRecord()
  const parsed = unwrapPersistedState<WalletState>(raw)
  if (!parsed) return createDefaultWalletState()

  return {
    ...createDefaultWalletState(),
    ...parsed,
    authorizedSites: normalizeAuthorizedSites(parsed.authorizedSites)
  }
}

async function updateWalletStateInStorage(
  updater: (current: WalletState) => WalletState
): Promise<WalletState> {
  const record = await getWalletStorageRecord()
  const current = await getWalletState()
  const nextState = updater(current)

  const nextRecord = isPersistedStateEnvelope<WalletState>(record)
    ? { ...(record as { state: WalletState; version?: number }), state: nextState }
    : nextState

  await chrome.storage.local.set({ [WALLET_STORAGE_KEY]: nextRecord })
  return nextState
}

function getActiveAddressFromState(state: WalletState): string | null {
  const account = state.accounts?.find((a) => a.id === state.activeAccountId) || state.accounts?.[0]
  const address = String(account?.address || '').trim()
  return address || null
}

async function getDappPermissionMap(): Promise<Record<string, DappPermission>> {
  try {
    const stored = await chrome.storage.local.get(DAPP_PERMISSIONS_STORAGE_KEY)
    return parseDappPermissions(stored[DAPP_PERMISSIONS_STORAGE_KEY])
  } catch {
    return {}
  }
}

async function setDappPermissionMap(next: Record<string, DappPermission>): Promise<void> {
  await chrome.storage.local.set({ [DAPP_PERMISSIONS_STORAGE_KEY]: next })
}

async function getPendingApproval(): Promise<DappPendingApproval | null> {
  try {
    const stored = await chrome.storage.local.get(DAPP_PENDING_APPROVAL_STORAGE_KEY)
    return parseDappPendingApproval(stored[DAPP_PENDING_APPROVAL_STORAGE_KEY])
  } catch {
    return null
  }
}

async function setPendingApproval(pending: DappPendingApproval): Promise<void> {
  await chrome.storage.local.set({ [DAPP_PENDING_APPROVAL_STORAGE_KEY]: pending })
}

async function clearPendingApprovalIfMatch(id: string): Promise<void> {
  const pending = await getPendingApproval()
  if (!pending || pending.id !== id) return
  await chrome.storage.local.remove(DAPP_PENDING_APPROVAL_STORAGE_KEY)
}

async function getPendingRequest(): Promise<DappPendingRequest | null> {
  try {
    const stored = await chrome.storage.local.get(DAPP_PENDING_REQUEST_STORAGE_KEY)
    return parseDappPendingRequest(stored[DAPP_PENDING_REQUEST_STORAGE_KEY])
  } catch {
    return null
  }
}

async function setPendingRequest(pending: DappPendingRequest): Promise<void> {
  await chrome.storage.local.set({ [DAPP_PENDING_REQUEST_STORAGE_KEY]: pending })
}

async function clearPendingRequestIfMatch(id: string): Promise<void> {
  const pending = await getPendingRequest()
  if (!pending || pending.id !== id) return
  await chrome.storage.local.remove(DAPP_PENDING_REQUEST_STORAGE_KEY)
}

async function ensureAuthorizedSite(origin: string): Promise<void> {
  await updateWalletStateInStorage((current) => {
    const sites = normalizeAuthorizedSites(current.authorizedSites)
    if (sites.includes(origin)) return { ...current, authorizedSites: sites }
    return { ...current, authorizedSites: [...sites, origin] }
  })
}

function hasAuthorizedSite(state: WalletState, origin: string): boolean {
  return normalizeAuthorizedSites(state.authorizedSites).includes(origin)
}

async function hasScope(origin: string, scope: DappScope): Promise<boolean> {
  const normalizedOrigin = normalizeDappOrigin(origin)
  if (!normalizedOrigin || normalizedOrigin === 'unknown') return false

  const [permissionMap, walletState] = await Promise.all([
    getDappPermissionMap(),
    getWalletState()
  ])
  const permission = permissionMap[normalizedOrigin]
  if (!permission) return false
  if (!hasAuthorizedSite(walletState, normalizedOrigin)) return false
  return permission.scopes.includes(scope)
}

async function grantScopes(origin: string, scopes: DappScope[]): Promise<void> {
  const normalizedOrigin = normalizeDappOrigin(origin)
  if (!normalizedOrigin || normalizedOrigin === 'unknown') return

  const permissionMap = await getDappPermissionMap()
  const previous = permissionMap[normalizedOrigin]

  permissionMap[normalizedOrigin] = {
    origin: normalizedOrigin,
    scopes: uniqDappScopes([...(previous?.scopes ?? []), ...scopes]),
    updatedAt: Date.now(),
    lastConnectedAt: previous?.lastConnectedAt
  }

  await setDappPermissionMap(permissionMap)
  await ensureAuthorizedSite(normalizedOrigin)
}

async function touchLastConnected(origin: string): Promise<void> {
  const normalizedOrigin = normalizeDappOrigin(origin)
  if (!normalizedOrigin || normalizedOrigin === 'unknown') return

  const permissionMap = await getDappPermissionMap()
  const permission = permissionMap[normalizedOrigin]
  if (!permission) return

  permissionMap[normalizedOrigin] = {
    ...permission,
    updatedAt: Date.now(),
    lastConnectedAt: Date.now()
  }
  await setDappPermissionMap(permissionMap)
}

function buildApprovalPopupUrl(): string {
  return buildPopupRouteUrl('/dapp/connect/1')
}

function buildRequestPopupUrl(requestId: string): string {
  return buildPopupRouteUrl(`/dapp/request/confirm?id=${encodeURIComponent(requestId)}`)
}

function buildUnlockPopupUrl(): string {
  return buildPopupRouteUrl('/unlock')
}

function buildPopupRouteUrl(route: string): string {
  const normalizedRoute = String(route || '').trim()
  const hashRoute = normalizedRoute.startsWith('/') ? normalizedRoute : `/${normalizedRoute}`
  return `${chrome.runtime.getURL(APP_ENTRY_PATH)}#${hashRoute}`
}

function buildWalletHomePopupUrl(): string {
  return buildPopupRouteUrl('/')
}

async function openWalletHomePopup(): Promise<void> {
  await openManagedPopup(buildWalletHomePopupUrl())
}

async function openApprovalPopup(): Promise<void> {
  await openManagedPopup(buildApprovalPopupUrl())
}

async function openRequestPopup(requestId: string): Promise<void> {
  await openManagedPopup(buildRequestPopupUrl(requestId))
}

async function openUnlockPopup(): Promise<void> {
  await openManagedPopup(buildUnlockPopupUrl())
}

async function openManagedPopup(url: string): Promise<void> {
  // Like Uniswap's wallet: requests show in the side panel instead of a new window.
  if (await routeToSidePanel(url) || await openInSidePanel(url)) return
  // Panel closed and the browser will not open it without a click: hold the screen,
  // badge the toolbar icon, and show it as soon as the user opens the panel.
  if (hasSidePanel()) {
    holdForSidePanel(url)
    return
  }
  const nextTask = managedPopupOpenQueue
    .catch(() => {
      // Keep queue alive after prior failure.
    })
    .then(() => openManagedPopupInternal(url))
  managedPopupOpenQueue = nextTask
  await nextTask
}

async function openManagedPopupInternal(url: string): Promise<void> {
  const left = await resolvePopupLeft()
  const top = await resolvePopupTop()

  const existingWindow = await findManagedPopupWindow()
  if (existingWindow?.id !== undefined) {
    const windowId = existingWindow.id
    managedPopupWindowId = windowId
    managedPopupWindowIds.add(windowId)
    await chrome.windows.update(windowId, {
      width: APP_POPUP_WIDTH,
      height: APP_POPUP_HEIGHT,
      left,
      top,
      focused: true
    })
    await updateManagedPopupWindowRoute(windowId, url)
    return
  }

  const created = await chrome.windows.create({
    url,
    type: 'popup',
    width: APP_POPUP_WIDTH,
    height: APP_POPUP_HEIGHT,
    left,
    top,
    focused: true
  })
  if (created && typeof created.id === 'number') {
    managedPopupWindowId = created.id
    managedPopupWindowIds.add(created.id)
  }
}

function isManagedPopupUrl(url: string | undefined): boolean {
  if (!url) return false
  const base = chrome.runtime.getURL(APP_ENTRY_PATH)
  return url.startsWith(base)
}

function windowHasManagedPopupTab(win: chrome.windows.Window | null | undefined): boolean {
  if (!win || win.type !== 'popup') return false
  const tabs = Array.isArray(win.tabs) ? win.tabs : []
  return tabs.some((tab) => isManagedPopupUrl(tab?.url))
}

async function findManagedPopupWindow(): Promise<chrome.windows.Window | null> {
  if (typeof managedPopupWindowId === 'number') {
    try {
      const win = await chrome.windows.get(managedPopupWindowId, { populate: true })
      if (windowHasManagedPopupTab(win)) {
        return win
      }
    } catch {
      managedPopupWindowId = null
    }
  }

  try {
    const all = await chrome.windows.getAll({ populate: true })
    const managed = all.filter((win) => windowHasManagedPopupTab(win))
    if (managed.length === 0) return null

    const [primary, ...duplicates] = managed
    if (typeof primary.id === 'number') {
      managedPopupWindowId = primary.id
      managedPopupWindowIds.add(primary.id)
    }
    for (const dup of duplicates) {
      if (typeof dup.id === 'number') {
        managedPopupWindowIds.delete(dup.id)
        try {
          await chrome.windows.remove(dup.id)
        } catch {
          // Ignore close races.
        }
      }
    }
    return primary
  } catch {
    return null
  }
}

async function enforceSingleManagedPopupWindow(): Promise<void> {
  try {
    const all = await chrome.windows.getAll({ populate: true })
    const managed = all.filter((win) => windowHasManagedPopupTab(win))
    if (managed.length === 0) return

    let primary = managed[0]
    for (const candidate of managed) {
      const candidateFocused = candidate.focused === true
      const primaryFocused = primary.focused === true
      if (candidateFocused && !primaryFocused) {
        primary = candidate
      } else if (candidateFocused === primaryFocused) {
        const cId = typeof candidate.id === 'number' ? candidate.id : Number.MAX_SAFE_INTEGER
        const pId = typeof primary.id === 'number' ? primary.id : Number.MAX_SAFE_INTEGER
        if (cId < pId) primary = candidate
      }
    }

    if (typeof primary.id === 'number') {
      managedPopupWindowId = primary.id
      managedPopupWindowIds.add(primary.id)
    }

    for (const win of managed) {
      if (win.id === primary.id) continue
      if (typeof win.id !== 'number') continue
      managedPopupWindowIds.delete(win.id)
      try {
        await chrome.windows.remove(win.id)
      } catch {
        // Ignore close races.
      }
    }
  } catch {
    // Ignore transient window query errors.
  }
}

async function updateManagedPopupWindowRoute(windowId: number, url: string): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({ windowId })
    const targetTab = tabs[0]
    if (targetTab?.id !== undefined) {
      await chrome.tabs.update(targetTab.id, { url, active: true })
      return
    }
    await chrome.tabs.create({ windowId, url, active: true })
  } catch {
    // Ignore tab update/create races.
  }
}

async function resolvePopupLeft(): Promise<number | undefined> {
  try {
    const base = await chrome.windows.getLastFocused()
    const baseLeft = Number(base.left)
    const baseWidth = Number(base.width)
    if (!Number.isFinite(baseLeft) || !Number.isFinite(baseWidth)) return undefined
    return Math.max(0, Math.round(baseLeft + (baseWidth - APP_POPUP_WIDTH) / 2))
  } catch {
    return undefined
  }
}

async function resolvePopupTop(): Promise<number | undefined> {
  try {
    const base = await chrome.windows.getLastFocused()
    const baseTop = Number(base.top)
    const baseHeight = Number(base.height)
    if (!Number.isFinite(baseTop) || !Number.isFinite(baseHeight)) return undefined
    return Math.max(0, Math.round(baseTop + (baseHeight - APP_POPUP_HEIGHT) / 2))
  } catch {
    return undefined
  }
}

async function enforceManagedPopupBounds(windowId: number): Promise<void> {
  try {
    const win = await chrome.windows.get(windowId)
    if (win.type !== 'popup') return
    const nextBounds: chrome.windows.UpdateInfo = {}
    if (typeof win.width === 'number' && win.width !== APP_POPUP_WIDTH) {
      nextBounds.width = APP_POPUP_WIDTH
    }
    if (typeof win.height === 'number' && win.height > APP_POPUP_MAX_HEIGHT) {
      nextBounds.height = APP_POPUP_MAX_HEIGHT
    }
    if (Object.keys(nextBounds).length > 0) {
      await chrome.windows.update(windowId, nextBounds)
    }
  } catch {
    // Ignore transient failures (window closed/race).
  }
}

type ApprovalDecision = 'approved' | 'rejected' | 'timeout'
type RequestDecision = 'executed' | 'failed' | 'rejected' | 'timeout'

async function waitForApprovalDecision(id: string, timeoutMs: number): Promise<ApprovalDecision> {
  return new Promise((resolve) => {
    let settled = false

    const finish = (decision: ApprovalDecision): void => {
      if (settled) return
      settled = true
      chrome.storage.onChanged.removeListener(onStorageChanged)
      clearTimeout(timeout)
      resolve(decision)
    }

    const onStorageChanged = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ): void => {
      if (areaName !== 'local' || !changes[DAPP_PENDING_APPROVAL_STORAGE_KEY]) return
      const next = parseDappPendingApproval(changes[DAPP_PENDING_APPROVAL_STORAGE_KEY].newValue)
      if (!next || next.id !== id) return
      if (next.status === 'approved') finish('approved')
      if (next.status === 'rejected') finish('rejected')
    }

    const timeout = setTimeout(() => finish('timeout'), Math.max(1000, timeoutMs))
    chrome.storage.onChanged.addListener(onStorageChanged)

    void getPendingApproval().then((pending) => {
      if (!pending || pending.id !== id) return
      if (pending.status === 'approved') finish('approved')
      if (pending.status === 'rejected') finish('rejected')
    })
  })
}

async function waitForRequestDecision(
  id: string,
  timeoutMs: number
): Promise<{ decision: RequestDecision; result?: DappRequestResult; error?: DappRequestError }> {
  return new Promise((resolve) => {
    let settled = false

    const finish = (
      decision: RequestDecision,
      result?: DappRequestResult,
      error?: DappRequestError
    ): void => {
      if (settled) return
      settled = true
      chrome.storage.onChanged.removeListener(onStorageChanged)
      clearTimeout(timeout)
      resolve({ decision, result, error })
    }

    const applyPending = (pending: DappPendingRequest | null): void => {
      if (!pending || pending.id !== id) return
      if (pending.status === 'executed' && pending.result) {
        finish('executed', pending.result)
        return
      }
      if (pending.status === 'failed') {
        finish('failed', undefined, pending.error || { code: -32603, message: 'Transaction failed' })
        return
      }
      if (pending.status === 'rejected') {
        finish('rejected')
      }
    }

    const onStorageChanged = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ): void => {
      if (areaName !== 'local' || !changes[DAPP_PENDING_REQUEST_STORAGE_KEY]) return
      const next = parseDappPendingRequest(changes[DAPP_PENDING_REQUEST_STORAGE_KEY].newValue)
      applyPending(next)
    }

    const timeout = setTimeout(() => finish('timeout'), Math.max(1000, timeoutMs))
    chrome.storage.onChanged.addListener(onStorageChanged)

    void getPendingRequest().then((pending) => applyPending(pending))
  })
}

function parseSendTransactionParams(params: unknown, maxDecimals = 8): SendTransactionParams {
  const candidate = Array.isArray(params) ? params[0] : params
  if (!candidate || typeof candidate !== 'object') {
    throw { code: -32602, message: 'wallet_sendTransaction requires params { to, amount }' }
  }

  const payload = candidate as Record<string, unknown>
  const to = String(payload.to ?? payload.address ?? '').trim()
  if (!to) {
    throw { code: -32602, message: 'wallet_sendTransaction requires a recipient `to` address' }
  }

  const amountRaw = payload.amount ?? payload.value
  const amount = typeof amountRaw === 'string'
    ? amountRaw.trim()
    : (typeof amountRaw === 'number' ? String(amountRaw) : '')
  if (!amount) {
    throw { code: -32602, message: 'wallet_sendTransaction requires `amount` as a decimal coin string' }
  }
  if (!/^\d+(\.\d+)?$/.test(amount)) {
    throw { code: -32602, message: 'wallet_sendTransaction amount must be a positive decimal string' }
  }
  if (amount.includes('.') && amount.split('.')[1].length > maxDecimals) {
    throw { code: -32602, message: `wallet_sendTransaction supports up to ${maxDecimals} decimal places` }
  }
  if (Number(amount) <= 0) {
    throw { code: -32602, message: 'wallet_sendTransaction amount must be greater than zero' }
  }

  return { to, amount }
}

function parseSendAssetParams(params: unknown): SendAssetParams {
  const candidate = Array.isArray(params) ? params[0] : params
  if (!candidate || typeof candidate !== 'object') {
    throw { code: -32602, message: 'wallet_sendAsset requires params { assetId, qty, toAddress }' }
  }

  const payload = candidate as Record<string, unknown>
  const assetId = String(payload.assetId ?? payload.asset ?? payload.tokenId ?? '').trim()
  const toAddress = String(payload.toAddress ?? payload.to ?? payload.address ?? '').trim()
  const qtyRaw = payload.qty ?? payload.amount ?? payload.value
  const qty = typeof qtyRaw === 'string'
    ? qtyRaw.trim()
    : (typeof qtyRaw === 'number' ? String(qtyRaw) : '')

  if (!assetId) throw { code: -32602, message: 'wallet_sendAsset requires `assetId`' }
  if (!toAddress) throw { code: -32602, message: 'wallet_sendAsset requires recipient `toAddress`' }
  if (!qty) throw { code: -32602, message: 'wallet_sendAsset requires `qty` as a decimal string' }
  if (!/^\d+(\.\d+)?$/.test(qty)) throw { code: -32602, message: 'wallet_sendAsset qty must be a positive decimal string' }
  if (Number(qty) <= 0) throw { code: -32602, message: 'wallet_sendAsset qty must be greater than zero' }

  return { assetId, qty, toAddress }
}

async function requestDappActionApproval(
  origin: string,
  networkId: string,
  accountId: string,
  method: 'wallet_sendTransaction' | 'wallet_sendAsset',
  request: SendTransactionParams | SendAssetParams
): Promise<DappRequestResult> {
  const normalizedOrigin = normalizeDappOrigin(origin)
  if (!normalizedOrigin || normalizedOrigin === 'unknown') {
    throw { code: 4001, message: 'Untrusted origin' }
  }

  const now = Date.now()
  const pending = await getPendingRequest()
  if (pending && pending.status === 'pending' && pending.expiresAt > now) {
    throw { code: 4001, message: 'Another wallet request is already pending approval' }
  }

  const requestId = globalThis.crypto?.randomUUID?.() ?? `${now}-${Math.random().toString(16).slice(2)}`
  const nextPending: DappPendingRequest = {
    id: requestId,
    origin: normalizedOrigin,
    method,
    networkId,
    accountId,
    request,
    status: 'pending',
    requestedAt: now,
    updatedAt: now,
    expiresAt: now + DAPP_APPROVAL_TIMEOUT_MS
  }

  await setPendingRequest(nextPending)

  try {
    await openRequestPopup(requestId)
  } catch {
    await clearPendingRequestIfMatch(requestId)
    throw { code: 4001, message: 'Unable to open wallet approval popup' }
  }

  const decision = await waitForRequestDecision(requestId, DAPP_APPROVAL_TIMEOUT_MS)
  if (decision.decision === 'executed' && decision.result) {
    await clearPendingRequestIfMatch(requestId)
    return decision.result
  }
  await clearPendingRequestIfMatch(requestId)
  if (decision.decision === 'rejected' || decision.decision === 'timeout') {
    throw { code: 4001, message: 'User rejected the request' }
  }
  throw {
    code: decision.error?.code ?? -32603,
    message: decision.error?.message ?? 'Transaction failed'
  }
}

// Request scope permission(s) in a single approval popup.
async function requestScopes(origin: string, scopes: DappScope[]): Promise<boolean> {
  const normalizedOrigin = normalizeDappOrigin(origin)
  if (!normalizedOrigin || normalizedOrigin === 'unknown') return false

  const desiredScopes = uniqDappScopes(scopes)
  if (desiredScopes.length === 0) return false

  const missingScopes: DappScope[] = []
  for (const scope of desiredScopes) {
    if (!(await hasScope(normalizedOrigin, scope))) {
      missingScopes.push(scope)
    }
  }
  if (missingScopes.length === 0) {
    return true
  }

  const now = Date.now()
  const pending = await getPendingApproval()

  if (
    pending &&
    pending.status === 'pending' &&
    pending.origin !== normalizedOrigin &&
    pending.expiresAt > now
  ) {
    return false
  }

  const approvalId = pending?.origin === normalizedOrigin && pending.status === 'pending'
    ? pending.id
    : (globalThis.crypto?.randomUUID?.() ?? `${now}-${Math.random().toString(16).slice(2)}`)

  const nextPending: DappPendingApproval = {
    id: approvalId,
    origin: normalizedOrigin,
    scopes: uniqDappScopes([...(pending?.origin === normalizedOrigin ? pending.scopes : []), ...missingScopes]),
    status: 'pending',
    requestedAt: pending?.origin === normalizedOrigin ? pending.requestedAt : now,
    updatedAt: now,
    expiresAt: now + DAPP_APPROVAL_TIMEOUT_MS
  }

  await setPendingApproval(nextPending)

  try {
    await openApprovalPopup()
  } catch {
    await clearPendingApprovalIfMatch(approvalId)
    return false
  }

  const decision = await waitForApprovalDecision(approvalId, DAPP_APPROVAL_TIMEOUT_MS)
  if (decision !== 'approved') {
    await clearPendingApprovalIfMatch(approvalId)
    return false
  }

  await grantScopes(normalizedOrigin, nextPending.scopes)
  await clearPendingApprovalIfMatch(approvalId)
  return true
}

// Request one scope helper
async function requestScope(origin: string, scope: DappScope): Promise<boolean> {
  return requestScopes(origin, [scope])
}


function buildProviderState(state: WalletState) {
  const unlocked = !(state.isLocked ?? true) && (state.isInitialized ?? false)
  const address = unlocked ? getActiveAddressFromState(state) : null
  return {
    connected: unlocked && address !== null,
    unlocked,
    coinId: RTM_NETWORK.id,
    coinName: RTM_NETWORK.name,
    coinSymbol: RTM_NETWORK.symbol,
    coinDecimals: RTM_DECIMALS,
    chainId: RTM_NETWORK.id,
    networkId: RTM_NETWORK.id,
    networkLabel: RTM_NETWORK.name,
    accounts: address ? [address] : [],
    selectedAddress: address
  }
}

/** Ensures an initialized, unlocked wallet with an address; opens the unlock popup otherwise. */
async function requireUnlockedAddressAfterUnlock(): Promise<{ state: WalletState; address: string; accountId: string }> {
  const deadline = Date.now() + DAPP_APPROVAL_TIMEOUT_MS
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 400))
    const state = await getWalletState()
    if (!(state.isLocked ?? true)) return requireUnlockedAddress()
  }
  throw { code: 4901, message: 'Wallet is locked' }
}

async function requireUnlockedAddress(): Promise<{ state: WalletState; address: string; accountId: string }> {
  const state = await getWalletState()
  if (!(state.isInitialized ?? false) || !(state.hasVault ?? false)) {
    throw { code: -32603, message: 'Wallet is not initialized' }
  }
  if (state.isLocked ?? true) {
    try {
      await openUnlockPopup()
    } catch {
      throw { code: 4901, message: 'Wallet is locked' }
    }
    // Wait for the user to unlock, then carry on with the same request.
    return requireUnlockedAddressAfterUnlock()
  }
  const account = state.accounts?.find((a) => a.id === state.activeAccountId) || state.accounts?.[0]
  const address = getActiveAddressFromState(state)
  if (!account || !address) throw { code: -32603, message: 'No account available' }
  return { state, address, accountId: account.id }
}

async function requireScopes(origin: string | undefined, scopes: DappScope[]): Promise<void> {
  if (!origin) return
  if (!(await requestScopes(origin, scopes))) throw { code: 4001, message: 'User rejected the request' }
  await touchLastConnected(origin)
}

async function handleRpcMethod(method: string, params: any, origin?: string): Promise<any> {
  const state = await getWalletState()

  if (PROVIDER_STATE_METHODS.has(method)) return buildProviderState(state)

  if (NETWORKS_METHODS.has(method)) return [{ ...RTM_NETWORK, active: true }]

  if (CAPABILITIES_METHODS.has(method)) {
    const providerState = buildProviderState(state)
    return {
      wallet: { isMetaYoshi: true, connected: providerState.connected, unlocked: providerState.unlocked },
      network: { id: RTM_NETWORK.id, name: RTM_NETWORK.name, symbol: RTM_NETWORK.symbol, coinType: RTM_NETWORK.coinType },
      features: { nativeSend: true, signMessage: false, assetLayer: true, assetSend: true },
      scopes: { read: true, sign: false, send_coin: true, send_asset: true },
      methods: DAPP_SDK_METHODS,
      networks: [{ ...RTM_NETWORK, active: true }]
    }
  }

  if (CONNECT_METHODS.has(method)) {
    await requireScopes(origin, ['read'])
    await requireUnlockedAddress()
    return buildProviderState(await getWalletState())
  }

  if (REQUEST_ACCOUNTS_METHODS.has(method)) {
    // Unlock first so the connect screens never show over a locked wallet.
    await requireUnlockedAddress()
    await requireScopes(origin, ['read'])
    const { address } = await requireUnlockedAddress()
    return [address]
  }

  if (ACCOUNTS_METHODS.has(method)) {
    if ((state.isLocked ?? true) || !(state.isInitialized ?? false)) return []
    if (origin && !(await hasScope(origin, 'read'))) return []
    const address = getActiveAddressFromState(state)
    return address ? [address] : []
  }

  if (SIGN_MESSAGE_METHODS.has(method)) {
    throw { code: -32601, message: `Method not supported: ${method}` }
  }

  // A payment request needs no prior "connect": the confirmation screen shows the
  // site, recipient and amount, nothing is sent without approval, and no address
  // is revealed to the site. One flow: unlock if needed, then confirm.
  if (SEND_TRANSACTION_METHODS.has(method)) {
    const parsed = parseSendTransactionParams(params, RTM_DECIMALS)
    const { accountId } = await requireUnlockedAddress()
    return requestDappActionApproval(origin || 'unknown', RTM_NETWORK.id, accountId, 'wallet_sendTransaction', parsed)
  }

  if (SEND_ASSET_METHODS.has(method)) {
    const parsed = parseSendAssetParams(params)
    const { accountId } = await requireUnlockedAddress()
    return requestDappActionApproval(origin || 'unknown', RTM_NETWORK.id, accountId, 'wallet_sendAsset', parsed)
  }

  if (SELECT_ACCOUNT_METHODS.has(method)) {
    await requireScopes(origin, ['read'])
    const { index } = params || {}
    if (typeof index !== 'number') throw { code: -32602, message: 'Account index is required' }
    const account = state.accounts?.[index]
    if (!account) throw { code: -32602, message: 'Invalid account index' }
    const next = await updateWalletStateInStorage((current) => ({ ...current, activeAccountId: account.id }))
    const address = getActiveAddressFromState(next)
    return { selectedAddress: address, accounts: address ? [address] : [] }
  }

  throw { code: -32601, message: `Method not found: ${method}` }
}

// Broadcast event to all connected content scripts
function broadcastEvent(event: string, payload: any): void {
  const message = { type: 'event', event, payload }
  for (const port of eventPorts) {
    try {
      port.postMessage(message)
    } catch {
      eventPorts.delete(port)
    }
  }
}

chrome.runtime.onMessage.addListener((message: DappRequest | MonitorRequest, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
  if (message?.type === 'METAYOSHI_MONITOR_GET_ERRORS') {
    void getRuntimeErrorLog()
      .then((errors) => sendResponse({ ok: true, errors }))
      .catch((err) => sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) }))
    return true
  }

  if (message?.type === 'METAYOSHI_MONITOR_CLEAR_ERRORS') {
    void clearRuntimeErrorLog()
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) }))
    return true
  }

  if (message.type === 'DAPP_INTERNAL_RPC') {
    const { request, origin } = message
    const originUrl = origin || sender?.origin || sender?.url || 'unknown'

    handleRpcMethod(request.method, request.params, originUrl)
      .then((result) => {
        const response: JsonRpcResponse = { jsonrpc: '2.0', id: request.id ?? null, result }
        sendResponse({ ok: true, jsonRpc: response })
      })
      .catch((err) => {
        void recordRuntimeError('background-sw', err, { kind: 'dapp-rpc', method: request.method, origin: originUrl })
        const response: JsonRpcResponse = {
          jsonrpc: '2.0',
          id: request.id ?? null,
          error: { code: err.code || -32603, message: err.message || 'Internal error', data: err.data }
        }
        sendResponse({ ok: true, jsonRpc: response })
      })

    return true // Keep channel open for async response
  }

  return false
})

// Broadcast wallet changes once, regardless of how many pages are connected.
chrome.storage.onChanged.addListener((changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
  if (areaName !== 'local' || !changes[WALLET_STORAGE_KEY] || eventPorts.size === 0) return
  const newState = unwrapPersistedState<WalletState>(changes[WALLET_STORAGE_KEY].newValue)
  const oldState = unwrapPersistedState<WalletState>(changes[WALLET_STORAGE_KEY].oldValue)
  if (!newState || !oldState) return

  const newAddress = buildProviderState(newState).selectedAddress
  const oldAddress = buildProviderState(oldState).selectedAddress
  if (newAddress !== oldAddress) {
    broadcastEvent('accountsChanged', { accounts: newAddress ? [newAddress] : [], address: newAddress })
  }
  if (newState.isLocked !== oldState.isLocked) {
    broadcastEvent('lockChanged', { unlocked: !(newState.isLocked ?? true) })
  }
})

chrome.runtime.onConnect.addListener((port: chrome.runtime.Port) => {
  if (port.name !== BG_EVENT_PORT_NAME) return
  eventPorts.add(port)
  port.onDisconnect.addListener(() => eventPorts.delete(port))
  port.postMessage({ type: 'ready', events: ['accountsChanged', 'lockChanged'] })
})

// Open side panels (Chrome/Edge side panel, Firefox sidebar), by browser window.
const sidePanelPorts = new Map<number, chrome.runtime.Port>()

chrome.runtime.onConnect.addListener((port: chrome.runtime.Port) => {
  if (!port.name.startsWith(SIDE_PANEL_PORT_PREFIX)) return
  const windowId = Number(port.name.slice(SIDE_PANEL_PORT_PREFIX.length))
  const key = Number.isFinite(windowId) ? windowId : -1
  sidePanelPorts.set(key, port)
  port.onDisconnect.addListener(() => {
    if (sidePanelPorts.get(key) === port) sidePanelPorts.delete(key)
  })
  if (heldPanelRoute) {
    port.postMessage({ type: 'route', route: heldPanelRoute })
    clearHeldPanelRoute()
  }
})

/** The browser shows extension pages beside the page (Chrome/Edge side panel or Firefox sidebar). */
function hasSidePanel(): boolean {
  return Boolean(chrome.sidePanel?.open) || Boolean((globalThis as { browser?: { sidebarAction?: unknown } }).browser?.sidebarAction)
}

// A wallet screen waiting for the side panel to be opened.
let heldPanelRoute: string | null = null
let heldPanelTimer: ReturnType<typeof setTimeout> | undefined

function holdForSidePanel(url: string): void {
  const hash = url.indexOf('#')
  heldPanelRoute = hash >= 0 ? url.slice(hash + 1) : '/'
  void chrome.action?.setBadgeBackgroundColor?.({ color: '#ed7834' })
  void chrome.action?.setBadgeText?.({ text: '1' })
  clearTimeout(heldPanelTimer)
  heldPanelTimer = setTimeout(clearHeldPanelRoute, DAPP_APPROVAL_TIMEOUT_MS)
}

function clearHeldPanelRoute(): void {
  heldPanelRoute = null
  clearTimeout(heldPanelTimer)
  void chrome.action?.setBadgeText?.({ text: '' })
}

/**
 * Opens the side panel in the focused window and shows `url` there. Chrome only
 * allows this in response to a user action; false (popup fallback) otherwise.
 */
async function openInSidePanel(url: string): Promise<boolean> {
  if (!chrome.sidePanel?.open) return false
  try {
    const win = await chrome.windows.getLastFocused({ windowTypes: ['normal'] })
    if (typeof win.id !== 'number') return false
    await chrome.sidePanel.open({ windowId: win.id })
  } catch {
    return false
  }
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await routeToSidePanel(url)) return true
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  return false
}

/** Shows a wallet route in an open side panel (the focused window's first); false when none is open. */
async function routeToSidePanel(url: string): Promise<boolean> {
  if (sidePanelPorts.size === 0) return false
  let focused = -1
  try {
    focused = (await chrome.windows.getLastFocused()).id ?? -1
  } catch {
    // No focused window; use any open panel.
  }
  const port = sidePanelPorts.get(focused) ?? sidePanelPorts.values().next().value
  if (!port) return false
  const hash = url.indexOf('#')
  try {
    port.postMessage({ type: 'route', route: hash >= 0 ? url.slice(hash + 1) : '/' })
    return true
  } catch {
    return false
  }
}

chrome.windows.onBoundsChanged.addListener((win) => {
  if (typeof win.id !== 'number') return
  if (!managedPopupWindowIds.has(win.id)) return
  void enforceManagedPopupBounds(win.id)
  void enforceSingleManagedPopupWindow()
})

chrome.windows.onRemoved.addListener((windowId) => {
  if (managedPopupWindowId === windowId) {
    managedPopupWindowId = null
  }
  managedPopupWindowIds.delete(windowId)
})

// Chrome/Edge: the toolbar button and its shortcut (Alt+Shift+M) open the wallet in the side panel.
// Firefox has no chrome.sidePanel; its button toggles the sidebar below (shortcut via _execute_sidebar_action).
chrome.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true })?.catch((err: unknown) => {
  void recordRuntimeError('background-sw', err, { kind: 'side-panel-behavior' })
})

const firefoxSidebar = (globalThis as { browser?: { sidebarAction?: { toggle?: () => Promise<void> } } }).browser?.sidebarAction

if (chrome.action?.onClicked) {
  chrome.action.onClicked.addListener(() => {
    // Must run synchronously inside the click for Firefox to allow it.
    if (firefoxSidebar?.toggle) {
      void firefoxSidebar.toggle().catch(() => openWalletHomePopup())
      return
    }
    void enforceSingleManagedPopupWindow()
    void openWalletHomePopup().catch((err) => {
      void recordRuntimeError('background-sw', err, { kind: 'open-wallet-popup' })
    })
  })
}

// Safety sweep: enforce singleton popup even if duplicate windows are created by races
// outside the normal openManagedPopup flow.
void enforceSingleManagedPopupWindow()
setInterval(() => {
  void enforceSingleManagedPopupWindow()
}, 1500)
