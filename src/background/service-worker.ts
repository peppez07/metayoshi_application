// Background Service Worker for MetaYoshi Wallet Extension
// Handles DApp RPC requests and message passing

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

const BG_EVENT_PORT_NAME = 'metayoshi-inpage-events'
const DEFAULT_NETWORK_ID = String(import.meta.env.VITE_DEFAULT_NETWORK || 'rtm').trim() || 'rtm'
const APP_POPUP_WIDTH = 380
const APP_POPUP_HEIGHT = 640
const APP_ENTRY_PATH = 'app/src/ui/index.html'
const managedPopupWindowIds = new Set<number>()

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

// Event ports for broadcasting events to content scripts
const eventPorts = new Set<chrome.runtime.Port>()

interface WalletState {
  isInitialized?: boolean
  isLocked?: boolean
  hasVault?: boolean
  accounts?: Array<{
    id: string
    addresses: { EVM?: string; UTXO?: string; XRP?: string }
    networkAddresses?: Record<string, string>
  }>
  activeAccountId?: string | null
  activeNetworkId?: string
  authorizedSites?: string[]
  networks?: Array<{ id: string; coinType: string; name: string; symbol: string; chainId?: number; capabilities?: any }>
}

function resolveDappNetworks(state: WalletState): Array<{ id: string; coinType: string; name: string; symbol: string; chainId?: number; capabilities?: any }> {
  return (state.networks || []).filter((network) => (
    (network?.coinType === 'UTXO' || network?.coinType === 'XRP') && Boolean(String(network.id || '').trim())
  ))
}

function resolveCoinDecimals(network?: { coinType?: string }): number {
  return network?.coinType === 'XRP' ? 6 : 8
}

installGlobalErrorMonitor('background-sw')

function createDefaultWalletState(): WalletState {
  return {
    isInitialized: false,
    isLocked: true,
    hasVault: false,
    accounts: [],
    activeAccountId: null,
    activeNetworkId: DEFAULT_NETWORK_ID,
    authorizedSites: [],
    networks: []
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

// Get wallet state from storage
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

function getActiveAddressFromState(state: WalletState, networkId: string): string | null {
  const normalizedNetworkId = String(networkId || '').trim()
  const network = state.networks?.find((n) => n.id === normalizedNetworkId)
  const account = state.accounts?.find((a) => a.id === state.activeAccountId) || state.accounts?.[0]
  if (!network || !account) return null

  const networkAddress = String(account.networkAddresses?.[normalizedNetworkId] || '').trim()
  if (networkAddress) return networkAddress

  if (network.coinType === 'EVM') {
    return account.addresses?.EVM || null
  }
  if (network.coinType === 'XRP') {
    return account.addresses?.XRP || null
  }
  if (network.coinType === 'UTXO') {
    return account.addresses?.UTXO || null
  }
  return null
}

// Get active account address based on network type
async function getActiveAddress(networkId: string): Promise<string | null> {
  const state = await getWalletState()
  return getActiveAddressFromState(state, networkId)
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
  const left = await resolvePopupLeft()
  const top = await resolvePopupTop()
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
    managedPopupWindowIds.add(created.id)
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

async function enforceManagedPopupWidth(windowId: number): Promise<void> {
  try {
    const win = await chrome.windows.get(windowId)
    if (win.type !== 'popup') return
    if (typeof win.width === 'number' && win.width !== APP_POPUP_WIDTH) {
      await chrome.windows.update(windowId, { width: APP_POPUP_WIDTH })
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

function parseSendTransactionParams(params: unknown): SendTransactionParams {
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
  if (amount.includes('.') && amount.split('.')[1].length > 8) {
    throw { code: -32602, message: 'wallet_sendTransaction supports up to 8 decimal places' }
  }
  if (Number(amount) <= 0) {
    throw { code: -32602, message: 'wallet_sendTransaction amount must be greater than zero' }
  }

  return { to, amount }
}

async function requestTransactionApproval(
  origin: string,
  networkId: string,
  accountId: string,
  request: SendTransactionParams
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
    method: 'wallet_sendTransaction',
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

type DappRuntimeContext = {
  state: WalletState
  dappNetworks: Array<{ id: string; coinType: string; name: string; symbol: string; chainId?: number; capabilities?: any }>
  network: { id: string; coinType: string; name: string; symbol: string; chainId?: number; capabilities?: any } | undefined
  effectiveNetworkId: string
  address: string | null
  connected: boolean
  unlocked: boolean
  providerState: {
    connected: boolean
    unlocked: boolean
    coinId: string | null
    coinName: string | null
    coinSymbol: string | null
    coinDecimals: number
    chainId: string | null
    networkId: string | null
    networkLabel: string | null
    accounts: string[]
    selectedAddress: string | null
  }
}

function buildDappRuntimeContext(state: WalletState): DappRuntimeContext {
  const dappNetworks = resolveDappNetworks(state)
  const network = dappNetworks.find((n) => n.id === state.activeNetworkId) || dappNetworks[0]
  const effectiveNetworkId = network?.id || DEFAULT_NETWORK_ID
  const address = getActiveAddressFromState(state, effectiveNetworkId)
  const connected = !(state.isLocked ?? true) && (state.isInitialized ?? false) && address !== null
  const unlocked = !(state.isLocked ?? true) && (state.isInitialized ?? false)

  return {
    state,
    dappNetworks,
    network,
    effectiveNetworkId,
    address,
    connected,
    unlocked,
    providerState: {
      connected,
      unlocked,
      coinId: network?.id || null,
      coinName: network?.name || null,
      coinSymbol: network?.symbol || null,
      coinDecimals: resolveCoinDecimals(network),
      chainId: network?.chainId?.toString() || network?.id || null,
      networkId: network?.id || null,
      networkLabel: network?.name || null,
      accounts: address ? [address] : [],
      selectedAddress: address
    }
  }
}

// Handle RPC methods
async function handleRpcMethod(method: string, params: any, origin?: string): Promise<any> {
  const runtime = buildDappRuntimeContext(await getWalletState())
  const {
    state,
    dappNetworks,
    network,
    effectiveNetworkId,
    address,
    connected,
    unlocked,
    providerState
  } = runtime
  
  // Provider state methods
  if (method === 'wallet_getProviderState' || method === 'metayoshi_getProviderState') {
    return providerState
  }

  if (method === 'wallet_connect' || method === 'metayoshi_connect') {
    if (origin) {
      const approved = await requestScope(origin, 'read')
      if (!approved) {
        throw { code: 4001, message: 'User rejected the request' }
      }
      await touchLastConnected(origin)
    }

    const refreshed = buildDappRuntimeContext(await getWalletState())
    if (!(refreshed.state.isInitialized ?? false) || !(refreshed.state.hasVault ?? false)) {
      throw { code: -32603, message: 'Wallet is not initialized' }
    }
    if (refreshed.state.isLocked ?? true) {
      try {
        await openUnlockPopup()
      } catch {
        // Ignore popup launch failures and return the lock error to dapp.
      }
      throw { code: 4901, message: 'Wallet is locked. Unlock popup opened.' }
    }
    if (!refreshed.address) {
      throw { code: -32603, message: 'No account available' }
    }
    return refreshed.providerState
  }

  if (method === 'wallet_getCapabilities' || method === 'metayoshi_getCapabilities') {
    const nativeSend = network?.coinType === 'UTXO'
    const features = {
      nativeSend,
      signMessage: false,
      assetLayer: false,
      assetSend: false
    }
    return {
      wallet: { isMetaYoshi: true, connected, unlocked },
      network: {
        id: network?.id || null,
        name: network?.name || null,
        symbol: network?.symbol || null,
        coinType: network?.coinType || null
      },
      features,
      scopes: {
        read: true,
        sign: features.signMessage,
        send_coin: features.nativeSend,
        send_asset: features.assetSend
      },
      methods: [
        'wallet_getProviderState',
        'wallet_requestAccounts',
        'wallet_accounts',
        'wallet_connect',
        'wallet_selectAccount',
        'wallet_switchNetwork',
        'wallet_getNetworks',
        'wallet_getCapabilities',
        'wallet_sendTransaction'
      ]
    }
  }

  if (method === 'wallet_getNetworks' || method === 'metayoshi_getNetworks') {
    return dappNetworks.map((n) => ({
      id: n.id,
      name: n.name,
      symbol: n.symbol,
      coinType: n.coinType,
      chainId: n.chainId ?? null,
      active: n.id === state.activeNetworkId
    }))
  }
  
  // Request accounts / enable
  if (method === 'wallet_requestAccounts' || method === 'metayoshi_requestAccounts') {
    if (origin) {
      const approved = await requestScope(origin, 'read')
      if (!approved) {
        throw { code: 4001, message: 'User rejected the request' }
      }
      await touchLastConnected(origin)
    }

    const refreshed = buildDappRuntimeContext(await getWalletState())
    if (!(refreshed.state.isInitialized ?? false) || !(refreshed.state.hasVault ?? false)) {
      throw { code: -32603, message: 'Wallet is not initialized' }
    }
    if (refreshed.state.isLocked ?? true) {
      try {
        await openUnlockPopup()
      } catch {
        // Ignore popup launch failures and return the lock error to dapp.
      }
      throw { code: 4901, message: 'Wallet is locked. Unlock popup opened.' }
    }
    if (!refreshed.address) {
      throw { code: -32603, message: 'No account available' }
    }

    return [refreshed.address]
  }
  
  // Get accounts
  if (method === 'wallet_accounts' || method === 'metayoshi_accounts') {
    if ((state.isLocked ?? true) || !(state.isInitialized ?? false)) {
      return []
    }

    const currentAddress = getActiveAddressFromState(state, effectiveNetworkId)
    return currentAddress ? [currentAddress] : []
  }
  
  if (
    method === 'wallet_signMessage'
    || method === 'metayoshi_signMessage'
  ) {
    throw { code: -32601, message: `Method not supported: ${method}` }
  }

  if (method === 'wallet_sendTransaction' || method === 'metayoshi_sendTransaction') {
    if (!(state.isInitialized ?? false) || !(state.hasVault ?? false)) {
      throw { code: -32603, message: 'Wallet is not initialized' }
    }
    if (!network || network.coinType !== 'UTXO') {
      throw { code: -32603, message: 'No supported send-capable network selected' }
    }
    const activeAccount = state.accounts?.find((a) => a.id === state.activeAccountId) || state.accounts?.[0]
    if (!activeAccount) {
      throw { code: -32603, message: 'No account available' }
    }

    if (origin) {
      const approved = await requestScopes(origin, ['read', 'send_coin'])
      if (!approved) {
        throw { code: 4001, message: 'User rejected the request' }
      }
      await touchLastConnected(origin)
    }

    const parsedSend = parseSendTransactionParams(params)
    const result = await requestTransactionApproval(
      origin || 'unknown',
      network.id,
      activeAccount.id,
      parsedSend
    )
    return result
  }
  
  // Select account
  if (method === 'wallet_selectAccount' || method === 'metayoshi_selectAccount') {
    const { index } = params || {}
    if (typeof index !== 'number') {
      throw { code: -32602, message: 'Account index is required' }
    }
    
    const currentState = await getWalletState()
    const account = currentState.accounts?.[index]
    if (!account) {
      throw { code: -32602, message: 'Invalid account index' }
    }
    
    // Update active account in storage
    await updateWalletStateInStorage((current) => ({
      ...current,
      activeAccountId: account.id
    }))
    
    const address = await getActiveAddress(currentState.activeNetworkId || DEFAULT_NETWORK_ID)
    return {
      selectedAddress: address,
      accounts: address ? [address] : []
    }
  }
  
  // Switch network
  if (method === 'wallet_switchNetwork' || method === 'metayoshi_switchNetwork') {
    const { networkId } = params || {}
    if (!networkId) {
      throw { code: -32602, message: 'Network ID is required' }
    }
    
    const currentState = await getWalletState()
    const normalizedNetworkId = String(networkId).trim()
    const network = resolveDappNetworks(currentState).find((n) => n.id === normalizedNetworkId)
    if (!network) {
      throw { code: -32602, message: `Unsupported network for MetaYoshi DApp SDK: ${networkId}` }
    }
    
    // Update active network in storage
    await updateWalletStateInStorage((current) => ({
      ...current,
      activeNetworkId: normalizedNetworkId
    }))
    
    // Broadcast network change event
    broadcastEvent('networkChanged', {
      networkId: normalizedNetworkId,
      networkLabel: network.name,
      coinId: network.id,
      coinName: network.name,
      coinSymbol: network.symbol,
      coinDecimals: resolveCoinDecimals(network)
    })
    
    return { networkId: normalizedNetworkId, networkLabel: network.name }
  }
  
  // Unsupported method
  throw { code: -32601, message: `Method not found: ${method}` }
}

// Broadcast event to all connected content scripts
function broadcastEvent(event: string, payload: any): void {
  const message = { type: 'event', event, payload }
  for (const port of eventPorts) {
    try {
      port.postMessage(message)
    } catch (err) {
      // Port closed, remove it
      eventPorts.delete(port)
    }
  }
}

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message: DappRequest | MonitorRequest, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
  if (message?.type === 'METAYOSHI_MONITOR_GET_ERRORS') {
    void getRuntimeErrorLog()
      .then((errors) => sendResponse({ ok: true, errors }))
      .catch((err) => {
        sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) })
      })
    return true
  }

  if (message?.type === 'METAYOSHI_MONITOR_CLEAR_ERRORS') {
    void clearRuntimeErrorLog()
      .then(() => sendResponse({ ok: true }))
      .catch((err) => {
        sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) })
      })
    return true
  }

  if (message.type === 'DAPP_INTERNAL_RPC') {
    const { request, origin } = message
    const originUrl = origin || sender?.origin || sender?.url || 'unknown'
    
    handleRpcMethod(request.method, request.params, originUrl)
      .then((result) => {
        const response: JsonRpcResponse = {
          jsonrpc: '2.0',
          id: request.id ?? null,
          result
        }
        sendResponse({ ok: true, jsonRpc: response })
      })
      .catch((err) => {
        void recordRuntimeError('background-sw', err, {
          kind: 'dapp-rpc',
          method: request.method,
          origin: originUrl
        })
        const response: JsonRpcResponse = {
          jsonrpc: '2.0',
          id: request.id ?? null,
          error: {
            code: err.code || -32603,
            message: err.message || 'Internal error',
            data: err.data
          }
        }
        sendResponse({ ok: true, jsonRpc: response })
      })
    
    return true // Keep channel open for async response
  }
  
  return false
})

// Handle event port connections
chrome.runtime.onConnect.addListener((port: chrome.runtime.Port) => {
  if (port.name === BG_EVENT_PORT_NAME) {
    eventPorts.add(port)
    
    port.onDisconnect.addListener(() => {
      eventPorts.delete(port)
    })
    
    // Send ready event
    port.postMessage({
      type: 'ready',
      events: ['accountsChanged', 'networkChanged', 'lockChanged']
    })
    
    // Listen for storage changes to broadcast events
    chrome.storage.onChanged.addListener((changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes[WALLET_STORAGE_KEY]) {
        const newValue = changes[WALLET_STORAGE_KEY].newValue
        const oldValue = changes[WALLET_STORAGE_KEY].oldValue
        const newState = unwrapPersistedState<WalletState>(newValue)
        const oldState = unwrapPersistedState<WalletState>(oldValue)
        
        if (newState && oldState) {
          const dappNetworks = resolveDappNetworks(newState)
          const activeDappNetwork = dappNetworks.find((n) => n.id === newState.activeNetworkId) || dappNetworks[0]
          const activeDappNetworkId = activeDappNetwork?.id || DEFAULT_NETWORK_ID
          
          // Accounts changed
          if (newState.activeAccountId !== oldState.activeAccountId || 
              JSON.stringify(newState.accounts) !== JSON.stringify(oldState.accounts)) {
            const address = getActiveAddressFromState(newState, activeDappNetworkId)
            broadcastEvent('accountsChanged', {
              accounts: address ? [address] : [],
              address
            })
          }
          
          // Network changed
          if (newState.activeNetworkId !== oldState.activeNetworkId) {
            const network = newState.networks?.find((n) => n.id === newState.activeNetworkId)
            if (network && (network.coinType === 'UTXO' || network.coinType === 'XRP') && String(network.id || '').trim()) {
              broadcastEvent('networkChanged', {
                networkId: network.id,
                networkLabel: network.name,
                coinId: network.id,
                coinName: network.name,
                coinSymbol: network.symbol,
                coinDecimals: resolveCoinDecimals(network)
              })
            }
          }
          
          // Lock state changed
          if (newState.isLocked !== oldState.isLocked) {
            broadcastEvent('lockChanged', {
              unlocked: !(newState.isLocked ?? true)
            })
            
            if (newState.isLocked) {
              broadcastEvent('accountsChanged', {
                accounts: [],
                address: null
              })
            }
          }
        }
      }
    })
  }
})

chrome.windows.onBoundsChanged.addListener((win) => {
  if (typeof win.id !== 'number') return
  if (!managedPopupWindowIds.has(win.id)) return
  void enforceManagedPopupWidth(win.id)
})

chrome.windows.onRemoved.addListener((windowId) => {
  managedPopupWindowIds.delete(windowId)
})

if (chrome.action?.onClicked) {
  chrome.action.onClicked.addListener(() => {
    void openWalletHomePopup().catch((err) => {
      void recordRuntimeError('background-sw', err, { kind: 'open-wallet-popup' })
    })
  })
}

// Initialize
console.log('MetaYoshi Wallet Background Service Worker initialized')

