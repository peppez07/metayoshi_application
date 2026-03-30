// Background Service Worker for MetaYoshi Wallet Extension
// Handles DApp RPC requests and message passing

import { Buffer } from 'buffer'

import {
  clearRuntimeErrorLog,
  getRuntimeErrorLog,
  installGlobalErrorMonitor,
  recordRuntimeError
} from '../lib/runtimeErrorMonitor'
import {
  clearBridgeTraceLog,
  getBridgeTraceLog,
  recordBridgeTrace
} from '../lib/bridgeTrace'
import {
  DAPP_BLOCKED_INTERNAL_ORIGIN_MESSAGE,
  DAPP_APPROVAL_TIMEOUT_MS,
  DAPP_PENDING_APPROVAL_STORAGE_KEY,
  DAPP_PENDING_REQUEST_STORAGE_KEY,
  DAPP_PERMISSIONS_STORAGE_KEY,
  isBlockedInternalDappOrigin,
  normalizeDappOrigin,
  parseDappPendingApproval,
  parseDappPendingRequest,
  parseDappPermissions,
  uniqDappScopes,
  type DappPendingApproval,
  type DappPendingRequest,
  type DappPermission,
  type DappKnownRequestPayload,
  type DappRequestError,
  type DappRequestMethod,
  type DappScope
} from '../lib/dappPermissions'
import { getAccountAddressForNetwork, isMultisigAccount } from '../lib/multisig'
import { callBridgeMethod, type UtxoRpcConfig } from '../lib/utxoRpc'
import { deriveUtxoAddress } from '../lib/utxoAddress'
import { setExtensionSurfaceRoute } from '../lib/extensionSurfaceRoute'
import {
  isPersistedStateEnvelope,
  readSessionMnemonicFromExtensionStorage,
  unwrapPersistedState,
  WALLET_STORAGE_KEY
} from '../lib/walletStorage'
import { resolveNetworkCapabilities } from '../lib/networkCapabilities'
import { INITIAL_NETWORKS, type Network } from '../coins'
import { getExtensionSurfaceOpenPolicy } from './extensionSurfacePolicy'

const BG_EVENT_PORT_NAME = 'metayoshi-inpage-events'
;(globalThis as typeof globalThis & { Buffer?: typeof Buffer }).Buffer ??= Buffer
const DEFAULT_NETWORK_ID = String(import.meta.env.VITE_DEFAULT_NETWORK || 'rtm').trim() || 'rtm'
const APP_ENTRY_PATH = 'app/src/ui/index.html'
const OPEN_WALLET_COMMAND = 'open-wallet'

type ExtensionSurfaceTarget = {
  tabId?: number
  windowId?: number
}

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

type OpenWalletSurfaceRequest = {
  type: 'METAYOSHI_OPEN_WALLET_SURFACE'
}

type MonitorRequest =
  | { type: 'METAYOSHI_MONITOR_GET_ERRORS' }
  | { type: 'METAYOSHI_MONITOR_CLEAR_ERRORS' }
  | { type: 'METAYOSHI_MONITOR_GET_BRIDGE_TRACE' }
  | { type: 'METAYOSHI_MONITOR_CLEAR_BRIDGE_TRACE' }

type SendTransactionParams =
  | {
      to: string
      amount: string
      memo?: string
    }
  | {
      to?: string
      value?: string
      data: string
      gasLimit?: string
      gasPrice?: string
      maxFeePerGas?: string
      maxPriorityFeePerGas?: string
      type?: 2
    };

type SendAssetParams = {
  assetId: string
  qty: string
  toAddress: string
  memo?: string
}

type RtmMarketActionParams = {
  version: 1
  kind: string
  orderId?: string
  listingId?: string
  networkId: string
  [key: string]: unknown
}

type RtmIssuerActionParams = {
  version: 1
  kind: string
  draftId: string
  networkId: string
  [key: string]: unknown
}

const PROVIDER_STATE_METHODS = new Set(['wallet_getProviderState', 'metayoshi_getProviderState', 'rtm_getProviderState'])
const OPEN_WALLET_METHODS = new Set(['wallet_openWallet', 'metayoshi_openWallet', 'rtm_openWallet'])
const CONNECT_METHODS = new Set(['wallet_connect', 'metayoshi_connect', 'rtm_connect'])
const CAPABILITIES_METHODS = new Set(['wallet_getCapabilities', 'metayoshi_getCapabilities', 'rtm_getCapabilities'])
const NETWORKS_METHODS = new Set(['wallet_getNetworks', 'metayoshi_getNetworks', 'rtm_getNetworks'])
const ACCOUNT_INFO_METHODS = new Set(['wallet_getAccount', 'metayoshi_getAccount', 'rtm_getAccount'])
const BALANCE_METHODS = new Set(['wallet_getBalance', 'metayoshi_getBalance', 'rtm_getBalance'])
const ASSET_BALANCES_METHODS = new Set(['wallet_getAssetBalances', 'metayoshi_getAssetBalances', 'rtm_getAssetBalances'])
const PORTFOLIO_METHODS = new Set(['wallet_getPortfolio', 'metayoshi_getPortfolio', 'rtm_getPortfolio'])
const REQUEST_ACCOUNTS_METHODS = new Set(['wallet_requestAccounts', 'metayoshi_requestAccounts', 'rtm_requestAccounts'])
const ACCOUNTS_METHODS = new Set(['wallet_accounts', 'metayoshi_accounts', 'rtm_accounts'])
const SIGN_MESSAGE_METHODS = new Set(['wallet_signMessage', 'metayoshi_signMessage', 'rtm_signMessage'])
const SIGN_TYPED_DATA_METHODS = new Set(['wallet_signTypedData'])
const SIGN_TRANSACTION_METHODS = new Set(['wallet_signTransaction'])
const SIGN_ALL_TRANSACTIONS_METHODS = new Set(['wallet_signAllTransactions'])
const SIGN_AND_SEND_TRANSACTION_METHODS = new Set(['wallet_signAndSendTransaction'])
const COSMOS_GET_KEY_METHODS = new Set(['wallet_cosmosGetKey'])
const COSMOS_SIGN_DIRECT_METHODS = new Set(['wallet_cosmosSignDirect'])
const COSMOS_SIGN_AMINO_METHODS = new Set(['wallet_cosmosSignAmino'])
const COSMOS_SEND_TX_METHODS = new Set(['wallet_cosmosSendTx'])
const SEND_TRANSACTION_METHODS = new Set(['wallet_sendTransaction', 'metayoshi_sendTransaction', 'rtm_sendTransaction'])
const SEND_ASSET_METHODS = new Set(['wallet_sendAsset', 'metayoshi_sendAsset', 'rtm_sendAsset'])
const RTM_SIGN_MESSAGE_METHODS = new Set(['wallet_rtmSignMessage'])
const RTM_MARKET_ACTION_METHODS = new Set(['wallet_rtmMarketAction'])
const RTM_ISSUER_ACTION_METHODS = new Set(['wallet_rtmIssuerAction'])
const RTM_GET_PUBLIC_KEY_METHODS = new Set(['wallet_rtmGetPublicKey'])
const RTM_ORDER_MARKET_ACTION_KINDS = new Set([
  'fund_seller_asset',
  'fund_seller_fee',
  'fund_buyer_rtm',
  'claim_buyer_rtm',
  'claim_seller_asset',
  'refund_seller_asset',
  'refund_buyer_rtm'
])
const RTM_LISTING_MARKET_ACTION_KINDS = new Set([
  'lock_listing_asset',
  'unlock_listing_asset',
  'refund_listing_asset'
])
const RTM_ASSET_MARKET_ACTION_KINDS = new Set([
  'fund_seller_asset',
  'claim_seller_asset',
  'refund_seller_asset',
  'lock_listing_asset',
  'unlock_listing_asset',
  'refund_listing_asset'
])
const SELECT_ACCOUNT_METHODS = new Set(['wallet_selectAccount', 'metayoshi_selectAccount', 'rtm_selectAccount'])
const SWITCH_NETWORK_METHODS = new Set(['wallet_switchNetwork', 'metayoshi_switchNetwork', 'rtm_switchNetwork'])
const ETHEREUM_ACCOUNTS_METHODS = new Set(['eth_accounts'])
const ETHEREUM_REQUEST_ACCOUNTS_METHODS = new Set(['eth_requestAccounts'])
const ETHEREUM_CHAIN_ID_METHODS = new Set(['eth_chainId'])
const ETHEREUM_SWITCH_CHAIN_METHODS = new Set(['wallet_switchEthereumChain'])
const ETHEREUM_ADD_CHAIN_METHODS = new Set(['wallet_addEthereumChain'])
const ETHEREUM_WATCH_ASSET_METHODS = new Set(['wallet_watchAsset'])
const ETHEREUM_SEND_TRANSACTION_METHODS = new Set(['eth_sendTransaction'])
const ETHEREUM_SIGN_TRANSACTION_METHODS = new Set(['eth_signTransaction'])
const ETHEREUM_SIGN_METHODS = new Set(['personal_sign', 'eth_sign'])
const ETHEREUM_SIGN_TYPED_DATA_METHODS = new Set(['eth_signTypedData', 'eth_signTypedData_v3', 'eth_signTypedData_v4'])
const ETHEREUM_GET_PERMISSIONS_METHODS = new Set(['wallet_getPermissions'])
const ETHEREUM_REQUEST_PERMISSIONS_METHODS = new Set(['wallet_requestPermissions'])
const ETHEREUM_REVOKE_PERMISSIONS_METHODS = new Set(['wallet_revokePermissions'])
const EVM_WRITE_OR_SENSITIVE_RPC_METHODS = new Set([
  'eth_sendrawtransaction',
  'eth_sendtransaction',
  'eth_sign',
  'personal_sign',
  'eth_signtypeddata',
  'eth_signtypeddata_v3',
  'eth_signtypeddata_v4',
  'eth_signtransaction',
  'eth_requestaccounts'
])
const COSMOS_CHAIN_ID_ALIASES: Record<string, string[]> = {
  cosmoshub: ['cosmoshub', 'cosmoshub-4', 'atom', 'cosmos'],
  osmosis: ['osmosis', 'osmosis-1', 'osmo'],
  injective: ['injective', 'injective-1', 'inj'],
  cro: ['cro', 'cronos', 'cronos-pos', 'cronosmainnet_25-1'],
  kujira: ['kujira', 'kaiyo-1'],
  noble: ['noble', 'noble-1'],
  juno: ['juno', 'juno-1'],
  stargaze: ['stargaze', 'stargaze-1'],
  neutron: ['neutron', 'neutron-1'],
  stride: ['stride', 'stride-1'],
  saga: ['saga', 'saga-1'],
  sei: ['sei', 'pacific-1', 'atlantic-2'],
  regen: ['regen', 'regen-1'],
  shentu: ['shentu', 'shentu-2'],
  bitcanna: ['bitcanna', 'bitcanna-1'],
  lumera: ['lumera', 'lumera-1'],
  quicksilver: ['quicksilver', 'quicksilver-2'],
  sentinel: ['sentinel', 'sentinelhub-2'],
  nibiru: ['nibiru', 'cataclysm-1'],
  nolus: ['nolus', 'pirin-1']
}
const EVM_CLIENT_VERSION = `MetaYoshi/${String(import.meta.env.VITE_APP_VERSION || 'dev').trim() || 'dev'}`

type EventPortRecord = {
  origin: string | null
}

// Track the page origin behind each event bridge so account-bearing events stay permission-scoped.
const eventPorts = new Map<chrome.runtime.Port, EventPortRecord>()
const inFlightScopeRequests = new Map<string, Promise<boolean>>()
const inFlightActionApprovals = new Map<string, Promise<unknown>>()
const scheduledWalletSurfaceOpens = new Map<string, number>()

interface WalletState {
  isInitialized?: boolean
  isLocked?: boolean
  hasVault?: boolean
  accounts?: Array<{
    id: string
    name?: string
    kind?: string
    family?: string
    derivationIndex?: number
    multisig?: unknown
    addresses: { EVM?: string; UTXO?: string; XRP?: string; COSMOS?: string }
    networkAddresses?: Record<string, string>
    networkBalances?: Record<string, string>
    balance?: string
  }>
  activeAccountId?: string | null
  activeNetworkId?: string
  authorizedSites?: string[]
  networks?: Array<{ id: string; runtimeModelId?: string; coinType: string; name: string; symbol: string; chainId?: number; capabilities?: any }>
  networkAssets?: Record<string, Record<string, number>>
  networkAssetLogos?: Record<string, Record<string, string>>
  networkAssetLabels?: Record<string, Record<string, string>>
  accountNetworkAssets?: Record<string, Record<string, number>>
  accountNetworkAssetLogos?: Record<string, Record<string, string>>
  accountNetworkAssetLabels?: Record<string, Record<string, string>>
}

type DappNetworkEntry = { id: string; runtimeModelId?: string; coinType: string; name: string; symbol: string; chainId?: number; capabilities?: any }

type DappNetworkDescriptor = {
  id: string
  runtimeModelId: string | null
  name: string
  symbol: string
  coinType: string
  chainId: number | null
  capabilities: {
    nativeSend: boolean
    assetLayer: boolean
    assetSend: boolean
    activity: boolean
  }
}

type DappMethodMatrix = {
  signMessage: boolean
  signTypedData: boolean
  signTransaction: boolean
  signAllTransactions: boolean
  signAndSendTransaction: boolean
  cosmosGetKey: boolean
  cosmosSignDirect: boolean
  cosmosSignAmino: boolean
  cosmosSendTx: boolean
  methods: string[]
}

type DappProtocol = 'evm-jsonrpc' | 'solana-jsonrpc' | 'cosmos-rest-bridge' | 'rtm-jsonrpc' | 'generic'

function buildFallbackDappNetworks(): DappNetworkEntry[] {
  return (INITIAL_NETWORKS || []).map((network) => ({
    id: String(network?.id || '').trim(),
    runtimeModelId: String(network?.runtimeModelId || '').trim() || undefined,
    coinType: String(network?.coinType || '').trim(),
    name: String(network?.name || '').trim(),
    symbol: String(network?.symbol || '').trim(),
    chainId: typeof network?.chainId === 'number' ? network.chainId : undefined,
    capabilities: network?.capabilities
  })).filter((network) => Boolean(network.id))
}

function buildDappNetworkDescriptor(
  network: DappNetworkEntry,
  active: boolean
): DappNetworkDescriptor & { active: boolean } {
  const caps = resolveNetworkCapabilities(network || {})
  return {
    id: String(network?.id || '').trim(),
    runtimeModelId: String(network?.runtimeModelId || '').trim() || null,
    name: String(network?.name || '').trim(),
    symbol: String(network?.symbol || '').trim(),
    coinType: String(network?.coinType || '').trim(),
    chainId: typeof network?.chainId === 'number' ? network.chainId : null,
    active,
    capabilities: {
      nativeSend: Boolean(caps.features.nativeSend),
      assetLayer: Boolean(caps.features.assetLayer),
      assetSend: Boolean(caps.features.assetSend),
      activity: Boolean(caps.features.activity)
    }
  }
}

function resolveDappNetworks(state: WalletState): DappNetworkEntry[] {
  const configured = (state.networks || []).filter((network) => {
    const id = String(network?.id || '').trim()
    return Boolean(id)
  })
  if (configured.length > 0) return configured
  return buildFallbackDappNetworks()
}

function getRpcParamObject(params: unknown): Record<string, unknown> | null {
  const candidate = Array.isArray(params) ? params[0] : params
  if (!candidate || typeof candidate !== 'object') return null
  const payload = candidate as Record<string, unknown>
  const nestedIntent = payload.intent
  if (nestedIntent && typeof nestedIntent === 'object' && !Array.isArray(nestedIntent)) {
    return {
      ...payload,
      ...(nestedIntent as Record<string, unknown>)
    }
  }
  return payload
}

function resolveDappProtocol(network?: DappNetworkEntry | null): DappProtocol {
  const coinType = String(network?.coinType || '').trim().toUpperCase()
  const runtimeModelId = String(network?.runtimeModelId || '').trim().toLowerCase()
  const networkId = String(network?.id || '').trim().toLowerCase()

  if (coinType === 'EVM') return 'evm-jsonrpc'
  if (
    networkId === 'rtm'
    || runtimeModelId === 'rtm'
    || runtimeModelId === 'raptoreum'
    || (coinType === 'UTXO' && networkId === 'raptoreum')
  ) {
    return 'rtm-jsonrpc'
  }
  if (
    coinType === 'SOL'
    || runtimeModelId === 'sol'
    || runtimeModelId === 'solana'
    || networkId === 'sol'
    || networkId === 'solana'
    || networkId === 'srv--solana-testnet'
  ) {
    return 'solana-jsonrpc'
  }
  if (
    coinType === 'COSMOS'
    || runtimeModelId === 'cosmos'
    || runtimeModelId === 'cro'
    || networkId === 'cosmos'
    || networkId === 'cro'
  ) {
    return 'cosmos-rest-bridge'
  }

  return 'generic'
}

function parseRequestedChainId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) return value
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  if (!normalized) return null
  if (/^0x[0-9a-f]+$/i.test(normalized)) {
    const parsed = Number.parseInt(normalized, 16)
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
  }
  if (/^\d+$/.test(normalized)) {
    const parsed = Number(normalized)
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
  }
  return null
}

function resolveRequestedDappNetwork(
  dappNetworks: DappNetworkEntry[],
  params: unknown
): { network?: DappNetworkEntry; hintProvided: boolean; hintSummary: string | null } {
  const payload = getRpcParamObject(params)
  if (!payload) return { network: undefined, hintProvided: false, hintSummary: null }

  const rawChainIdText = typeof payload.chainId === 'string' ? payload.chainId.trim() : ''

  const textHints = [
    payload.networkId,
    payload.coinId,
    payload.coin,
    payload.symbol,
    payload.runtimeModelId,
    payload.network,
    payload.blockchain,
    rawChainIdText && parseRequestedChainId(rawChainIdText) === null ? rawChainIdText : ''
  ]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
  const requestedChainId = parseRequestedChainId(payload.chainId)
  const hintProvided = textHints.length > 0 || requestedChainId !== null
  if (!hintProvided) {
    return { network: undefined, hintProvided: false, hintSummary: null }
  }

  const normalizedTextHints = textHints.map((value) => value.toLowerCase())
  const symbolHints = textHints.map((value) => value.toUpperCase())
  const network = dappNetworks.find((entry) => {
    const aliases = buildNetworkHintAliases(entry)
    const entryChainId = typeof entry.chainId === 'number' ? entry.chainId : null

    if (aliases.lowercase.some((alias) => normalizedTextHints.includes(alias))) return true
    if (aliases.uppercase.some((alias) => symbolHints.includes(alias))) return true
    if (requestedChainId !== null && entryChainId === requestedChainId) return true
    return false
  })

  const hintSummary = [
    ...textHints,
    ...(requestedChainId !== null ? [String(requestedChainId)] : [])
  ].join(', ') || null

  return { network, hintProvided: true, hintSummary }
}

function resolveCoinDecimals(network?: { coinType?: string; symbol?: string; id?: string }): number {
  const symbol = String(network?.symbol || '').trim().toUpperCase()
  const id = String(network?.id || '').trim().toLowerCase()
  if (network?.coinType === 'EVM') return 18
  if (network?.coinType === 'XRP') return 6
  if (network?.coinType === 'SOL' || symbol === 'SOL' || id === 'sol' || id === 'solana' || id === 'srv--solana-testnet') return 9
  if (symbol === 'SUI' || id === 'sui') return 9
  if (symbol === 'XLM' || id === 'xlm' || id === 'stellar') return 7
  if (symbol === 'TRX' || id === 'tron') return 6
  if (symbol === 'ADA' || id === 'ada') return 6
  if (symbol === 'XMR' || id === 'xmr') return 12
  return 8
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
    networks: buildFallbackDappNetworks()
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
  const sessionMnemonic = await readSessionMnemonicFromExtensionStorage()

  return {
    ...createDefaultWalletState(),
    ...parsed,
    ...(sessionMnemonic ? { sessionMnemonic } : {}),
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
  return String(getAccountAddressForNetwork(account as any, normalizedNetworkId, network.coinType) || '').trim() || null
}

function getActiveAccountFromState(state: WalletState) {
  return state.accounts?.find((a) => a.id === state.activeAccountId) || state.accounts?.[0] || null
}

function findFirstNetworkWithActiveAddress(
  state: WalletState,
  dappNetworks: DappNetworkEntry[]
): DappNetworkEntry | undefined {
  return dappNetworks.find((entry) => Boolean(getActiveAddressFromState(state, entry.id)))
}

function throwUnsupportedMultisigMethod(method: string): never {
  throw {
    code: -32603,
    message: `${method} is not supported for multisig accounts in this build`
  }
}

function findNetworkByCoinType(state: WalletState, coinType: string): DappNetworkEntry | undefined {
  const normalizedCoinType = String(coinType || '').trim().toUpperCase()
  const dappNetworks = resolveDappNetworks(state)
  const active = dappNetworks.find((entry) => entry.id === state.activeNetworkId && String(entry.coinType || '').trim().toUpperCase() === normalizedCoinType)
  if (active) return active
  return dappNetworks.find((entry) => String(entry.coinType || '').trim().toUpperCase() === normalizedCoinType)
}

function findNetworkByRuntimeModel(state: WalletState, modelId: string): DappNetworkEntry | undefined {
  const normalizedModelId = String(modelId || '').trim().toLowerCase()
  const dappNetworks = resolveDappNetworks(state)
  const active = dappNetworks.find((entry) => entry.id === state.activeNetworkId && String(entry.runtimeModelId || '').trim().toLowerCase() === normalizedModelId)
  if (active) return active
  return dappNetworks.find((entry) => String(entry.runtimeModelId || '').trim().toLowerCase() === normalizedModelId)
}

// Get active account address based on network type
async function getActiveAddress(networkId: string): Promise<string | null> {
  const state = await getWalletState()
  return getActiveAddressFromState(state, networkId)
}

async function requireDappScopes(origin: string | undefined, scopes: DappScope[]): Promise<string> {
  const normalizedOrigin = normalizeDappOrigin(String(origin || ''))
  if (!normalizedOrigin || normalizedOrigin === 'unknown') {
    throw { code: 4001, message: 'Untrusted origin' }
  }

  const approved = await requestScopes(normalizedOrigin, scopes)
  if (!approved) {
    throw { code: 4001, message: 'User rejected the request' }
  }

  await touchLastConnected(normalizedOrigin)
  return normalizedOrigin
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

function getSidePanelApi(): {
  setOptions?: (options: { tabId?: number; path?: string; enabled?: boolean }) => Promise<void>
  open?: (options: { tabId?: number; windowId?: number }) => Promise<void>
  setPanelBehavior?: (options: { openPanelOnActionClick: boolean }) => Promise<void>
} | null {
  const api = (chrome as typeof chrome & {
    sidePanel?: {
      setOptions?: (options: { tabId?: number; path?: string; enabled?: boolean }) => Promise<void>
      open?: (options: { tabId?: number; windowId?: number }) => Promise<void>
      setPanelBehavior?: (options: { openPanelOnActionClick: boolean }) => Promise<void>
    }
  }).sidePanel
  return api || null
}

function getSidebarActionApi(): {
  open?: () => Promise<void>
  setPanel?: (details: { panel: string }) => Promise<void>
} | null {
  const chromeApi = chrome as typeof chrome & {
    sidebarAction?: {
      open?: () => Promise<void>
      setPanel?: (details: { panel: string }) => Promise<void>
    }
  }
  const browserApi = globalThis as typeof globalThis & {
    browser?: {
      sidebarAction?: {
        open?: () => Promise<void>
        setPanel?: (details: { panel: string }) => Promise<void>
      }
    }
  }
  return chromeApi.sidebarAction || browserApi.browser?.sidebarAction || null
}

function buildApprovalRoutePath(): string {
  return '/dapp/connect/1'
}

function isWalletTxConfirmRequest(method: DappRequestMethod): boolean {
  return method === 'wallet_sendAsset' || method === 'wallet_sendTransaction'
}

function buildRequestRoutePath(requestId: string, method: DappRequestMethod): string {
  if (isWalletTxConfirmRequest(method)) {
    return `/tx/confirm?dappRequest=1&id=${encodeURIComponent(requestId)}`
  }
  return `/dapp/request/confirm?id=${encodeURIComponent(requestId)}`
}

function buildExtensionRouteUrl(routePath: string): string {
  return chrome.runtime.getURL(`${APP_ENTRY_PATH}#${routePath}`)
}

function createExtensionSurfaceError(detail: string): Error {
  return new Error(`Failed to open MetaYoshi side panel: ${detail}`)
}

function isSidePanelEligibleTab(tab: chrome.tabs.Tab | null | undefined): tab is chrome.tabs.Tab & { id: number } {
  if (typeof tab?.id !== 'number') return false
  const url = String(tab.url || '').trim().toLowerCase()
  if (!url) return false
  if (url.startsWith('http://') || url.startsWith('https://')) return true
  return false
}

async function findPreferredSidePanelTab(): Promise<chrome.tabs.Tab | null> {
  const candidateQueries: chrome.tabs.QueryInfo[] = [
    { active: true, lastFocusedWindow: true },
    { active: true, currentWindow: true }
  ]

  for (const query of candidateQueries) {
    try {
      const [activeTab] = await chrome.tabs.query(query)
      if (isSidePanelEligibleTab(activeTab)) {
        return activeTab
      }
    } catch {
      // Ignore transient tab query errors.
    }
  }

  try {
    const tabs = await chrome.tabs.query({ lastFocusedWindow: true })
    const eligibleTab = tabs.find((tab) => isSidePanelEligibleTab(tab))
    return eligibleTab || null
  } catch {
    return null
  }
}

async function resolveExtensionSurfaceTarget(target?: ExtensionSurfaceTarget): Promise<ExtensionSurfaceTarget> {
  const resolved: ExtensionSurfaceTarget = {
    ...(typeof target?.tabId === 'number' ? { tabId: target.tabId } : {}),
    ...(typeof target?.windowId === 'number' ? { windowId: target.windowId } : {})
  }

  if (typeof resolved.tabId !== 'number') {
    const preferredTab = await findPreferredSidePanelTab()
    if (preferredTab) {
      resolved.tabId = preferredTab.id
      if (typeof preferredTab.windowId === 'number') {
        resolved.windowId = preferredTab.windowId
      }
    }
  }

  if (typeof resolved.windowId !== 'number') {
    try {
      const win = await chrome.windows.getLastFocused()
      if (typeof win?.id === 'number') {
        resolved.windowId = win.id
      }
    } catch {
      // Ignore transient window query errors.
    }
  }

  return resolved
}

function isManagedExtensionUrl(url: string | undefined): boolean {
  if (!url) return false
  const base = chrome.runtime.getURL(APP_ENTRY_PATH)
  return url.startsWith(base)
}

async function findManagedExtensionTab(): Promise<chrome.tabs.Tab | null> {
  try {
    const tabs = await chrome.tabs.query({})
    const managed = tabs.filter((tab) => isManagedExtensionUrl(tab.url))
    if (managed.length === 0) return null

    let primary = managed[0]
    for (const candidate of managed) {
      if (candidate.active && !primary.active) {
        primary = candidate
      }
    }
    return primary
  } catch {
    return null
  }
}

async function openOrFocusExtensionTab(
  routePath: string,
  target?: ExtensionSurfaceTarget
): Promise<void> {
  const resolvedTarget = await resolveExtensionSurfaceTarget(target)
  const url = buildExtensionRouteUrl(routePath)
  const existingTab = await findManagedExtensionTab()

  if (typeof existingTab?.id === 'number') {
    await chrome.tabs.update(existingTab.id, { url, active: true })
    if (typeof existingTab.windowId === 'number') {
      await chrome.windows.update(existingTab.windowId, { focused: true })
    }
    return
  }

  await chrome.tabs.create({
    url,
    active: true,
    ...(typeof resolvedTarget.windowId === 'number' ? { windowId: resolvedTarget.windowId } : {})
  })
}

async function openOrFocusExtensionPopup(
  routePath: string,
  target?: ExtensionSurfaceTarget
): Promise<void> {
  const resolvedTarget = await resolveExtensionSurfaceTarget(target)
  const url = buildExtensionRouteUrl(routePath)
  const existingTab = await findManagedExtensionTab()

  if (typeof existingTab?.id === 'number') {
    await chrome.tabs.update(existingTab.id, { url, active: true })
    if (typeof existingTab.windowId === 'number') {
      try {
        await chrome.windows.update(existingTab.windowId, { focused: true })
      } catch {
        // Ignore popup focus normalization failures.
      }
    }
    return
  }

  await chrome.windows.create({
    url,
    type: 'popup',
    focused: true,
    width: 440,
    height: 760
  })
}

async function openExtensionSurface(
  routePath: string,
  target?: ExtensionSurfaceTarget,
  options?: { fallbackToTabOnSidePanelFailure?: boolean; preferPopupWindow?: boolean }
): Promise<void> {
  const resolvedTarget = await resolveExtensionSurfaceTarget(target)
  const sidePanel = getSidePanelApi()
  const sidebarAction = getSidebarActionApi()
  const fallbackToTabOnSidePanelFailure = options?.fallbackToTabOnSidePanelFailure ?? true
  const preferPopupWindow = options?.preferPopupWindow ?? false
  let sidePanelFailure: Error | null = null
  await setExtensionSurfaceRoute(routePath)

  if (!sidePanel && sidebarAction) {
    try {
      await sidebarAction.setPanel?.({ panel: buildExtensionRouteUrl(routePath) })
      await sidebarAction.open?.()
      return
    } catch (err) {
      sidePanelFailure = createExtensionSurfaceError('sidebar action open failed')
      void recordRuntimeError('background-sw', err, {
        kind: 'open-extension-surface-sidebar-action',
        routePath
      })
    }
  }

  if (!sidePanel) {
    if (!fallbackToTabOnSidePanelFailure) {
      throw createExtensionSurfaceError('sidePanel API unavailable')
    }
    if (preferPopupWindow) {
      await openOrFocusExtensionPopup(routePath, resolvedTarget)
      return
    }
    await openOrFocusExtensionTab(routePath, resolvedTarget)
    return
  }

  if (sidePanel.setOptions) {
    try {
      await sidePanel.setOptions({
        ...(typeof resolvedTarget.tabId === 'number' ? { tabId: resolvedTarget.tabId } : {}),
        path: APP_ENTRY_PATH,
        enabled: true
      })
    } catch (err) {
      try {
        await sidePanel.setOptions({
          path: APP_ENTRY_PATH,
          enabled: true
        })
      } catch (fallbackErr) {
        sidePanelFailure = createExtensionSurfaceError('configuration failed')
        void recordRuntimeError('background-sw', fallbackErr, {
          kind: 'open-extension-surface-set-options',
          routePath,
          attemptedTabId: resolvedTarget.tabId
        })
      }
    }
  }

  if (!sidePanelFailure && sidePanel.open) {
    try {
      if (typeof resolvedTarget.tabId === 'number') {
        await sidePanel.open({ tabId: resolvedTarget.tabId })
        return
      }
      if (typeof resolvedTarget.windowId === 'number') {
        await sidePanel.open({ windowId: resolvedTarget.windowId })
        return
      }
    } catch (err) {
      try {
        if (typeof resolvedTarget.windowId === 'number') {
          await sidePanel.open({ windowId: resolvedTarget.windowId })
          return
        }
      } catch (fallbackErr) {
        sidePanelFailure = createExtensionSurfaceError('open failed')
        void recordRuntimeError('background-sw', fallbackErr, {
          kind: 'open-extension-surface-open',
          routePath,
          attemptedTabId: resolvedTarget.tabId,
          attemptedWindowId: resolvedTarget.windowId
        })
      }
    }
  }

  if (sidePanelFailure) {
    if (fallbackToTabOnSidePanelFailure) {
      if (preferPopupWindow) {
        await openOrFocusExtensionPopup(routePath, resolvedTarget)
        return
      }
      await openOrFocusExtensionTab(routePath, resolvedTarget)
      return
    }
    throw sidePanelFailure
  }
}

async function openApprovalSurface(target?: ExtensionSurfaceTarget): Promise<void> {
  await openExtensionSurface(buildApprovalRoutePath(), target, getExtensionSurfaceOpenPolicy('approval'))
}

async function openRequestSurface(
  requestId: string,
  method: DappRequestMethod,
  target?: ExtensionSurfaceTarget
): Promise<void> {
  await openExtensionSurface(buildRequestRoutePath(requestId, method), target, getExtensionSurfaceOpenPolicy('request'))
}

async function openWalletSurface(target?: ExtensionSurfaceTarget): Promise<void> {
  const now = Date.now()
  const [pendingRequest, pendingApproval] = await Promise.all([
    getPendingRequest(),
    getPendingApproval()
  ])
  const routePath = (() => {
    if (
      pendingRequest
      && (pendingRequest.status === 'pending' || pendingRequest.status === 'approved')
      && pendingRequest.expiresAt > now
    ) {
      return buildRequestRoutePath(pendingRequest.id, pendingRequest.method)
    }
    if (
      pendingApproval
      && pendingApproval.status === 'pending'
      && pendingApproval.expiresAt > now
    ) {
      return buildApprovalRoutePath()
    }
    return '/wallet/assets'
  })()

  await openExtensionSurface(routePath, target, getExtensionSurfaceOpenPolicy('wallet'))
}

async function openWalletSurfaceWithoutTabFallback(target?: ExtensionSurfaceTarget): Promise<void> {
  const now = Date.now()
  const [pendingRequest, pendingApproval] = await Promise.all([
    getPendingRequest(),
    getPendingApproval()
  ])
  const routePath = (() => {
    if (
      pendingRequest
      && (pendingRequest.status === 'pending' || pendingRequest.status === 'approved')
      && pendingRequest.expiresAt > now
    ) {
      return buildRequestRoutePath(pendingRequest.id, pendingRequest.method)
    }
    if (
      pendingApproval
      && pendingApproval.status === 'pending'
      && pendingApproval.expiresAt > now
    ) {
      return buildApprovalRoutePath()
    }
    return '/wallet/assets'
  })()

  await openExtensionSurface(routePath, target, getExtensionSurfaceOpenPolicy('wallet'))
}

function buildSurfaceTargetKey(target?: ExtensionSurfaceTarget): string {
  const tabId = typeof target?.tabId === 'number' ? String(target.tabId) : 'na'
  const windowId = typeof target?.windowId === 'number' ? String(target.windowId) : 'na'
  return `${tabId}:${windowId}`
}

function cancelScheduledWalletSurfaceOpen(target?: ExtensionSurfaceTarget): void {
  const key = buildSurfaceTargetKey(target)
  const timer = scheduledWalletSurfaceOpens.get(key)
  if (timer === undefined) return
  clearTimeout(timer)
  scheduledWalletSurfaceOpens.delete(key)
}

function scheduleWalletSurfaceOpen(target?: ExtensionSurfaceTarget, delayMs = 250): void {
  cancelScheduledWalletSurfaceOpen(target)
  const key = buildSurfaceTargetKey(target)
  const timer = setTimeout(() => {
    scheduledWalletSurfaceOpens.delete(key)
    void openWalletSurfaceWithoutTabFallback(target).catch((err) => {
      void recordRuntimeError('background-sw', err, {
        kind: 'scheduled-open-wallet-surface',
        tabId: target?.tabId,
        windowId: target?.windowId
      })
    })
  }, Math.max(0, delayMs))
  scheduledWalletSurfaceOpens.set(key, timer as unknown as number)
}

type ApprovalDecision = 'approved' | 'rejected' | 'timeout'
type RequestDecision = 'executed' | 'failed' | 'rejected' | 'timeout'

function stableStringifyForComparison(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringifyForComparison(entry)).join(',')}]`
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringifyForComparison(entryValue)}`)
    return `{${entries.join(',')}}`
  }
  return JSON.stringify(String(value))
}

function areRequestsEquivalent(left: unknown, right: unknown): boolean {
  return stableStringifyForComparison(left) === stableStringifyForComparison(right)
}

function getPendingTimeoutMs(expiresAt: number, fallbackMs: number): number {
  const remainingMs = Math.max(1000, Math.trunc(Number(expiresAt || 0) - Date.now()))
  return Number.isFinite(remainingMs) ? remainingMs : fallbackMs
}

function summarizeTraceValue(value: unknown, maxLength = 180): string | undefined {
  if (value === undefined) return undefined
  try {
    const text = typeof value === 'string' ? value : JSON.stringify(value)
    if (!text) return undefined
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
  } catch {
    const text = String(value)
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
  }
}

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
): Promise<{ decision: RequestDecision; result?: unknown; error?: DappRequestError }> {
  return new Promise((resolve) => {
    let settled = false

    const finish = (
      decision: RequestDecision,
      result?: unknown,
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

function normalizeDecimalCoinAmount(
  value: unknown,
  maxDecimals: number,
  label: string,
  options?: { required?: boolean; allowZero?: boolean }
): string | undefined {
  const required = options?.required ?? true
  const allowZero = options?.allowZero ?? false
  const amount = typeof value === 'string'
    ? value.trim()
    : (typeof value === 'number' ? String(value) : '')

  if (!amount) {
    if (required) {
      throw { code: -32602, message: `wallet_sendTransaction requires \`${label}\` as a decimal coin string` }
    }
    return undefined
  }
  if (!/^\d+(\.\d+)?$/.test(amount)) {
    throw { code: -32602, message: `wallet_sendTransaction ${label} must be a positive decimal string` }
  }
  if (amount.includes('.') && amount.split('.')[1].length > maxDecimals) {
    throw { code: -32602, message: `wallet_sendTransaction supports up to ${maxDecimals} decimal places` }
  }
  if (!allowZero && Number(amount) <= 0) {
    throw { code: -32602, message: `wallet_sendTransaction ${label} must be greater than zero` }
  }
  if (allowZero && Number(amount) < 0) {
    throw { code: -32602, message: `wallet_sendTransaction ${label} must be zero or greater` }
  }
  return amount
}

function normalizeRpcQuantity(value: unknown, label: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < 0) {
      throw { code: -32602, message: `wallet_sendTransaction ${label} must be a non-negative integer or hex quantity` }
    }
    return String(value)
  }

  const text = String(value).trim()
  if (!text) return undefined
  if (/^\d+$/.test(text)) return text
  if (/^0x[0-9a-f]+$/i.test(text)) return text.toLowerCase()
  throw { code: -32602, message: `wallet_sendTransaction ${label} must be a non-negative integer or hex quantity` }
}

function parseSendTransactionParams(
  params: unknown,
  network: DappNetworkEntry | undefined,
  maxDecimals = 8
): SendTransactionParams {
  const candidate = Array.isArray(params) ? params[0] : params
  if (!candidate || typeof candidate !== 'object') {
    throw { code: -32602, message: 'wallet_sendTransaction requires params { to, amount } or EVM tx params { data, value? }' }
  }

  const payload = candidate as Record<string, unknown>
  const data = String(payload.data ?? '').trim()
  if (data) {
    if (network?.coinType !== 'EVM') {
      throw { code: -32602, message: 'wallet_sendTransaction EVM tx payloads are only supported on EVM networks' }
    }
    if (!/^0x([0-9a-f]{2})*$/i.test(data)) {
      throw { code: -32602, message: 'wallet_sendTransaction data must be a 0x-prefixed hex string' }
    }

    const to = String(payload.to ?? payload.address ?? '').trim()
    const value = normalizeDecimalCoinAmount(payload.value ?? payload.amount ?? '0', maxDecimals, 'value', {
      required: false,
      allowZero: true
    }) || '0'
    const parsedGasLimit = normalizeRpcQuantity(payload.gasLimit, 'gasLimit')
    const parsedGasPrice = normalizeRpcQuantity(payload.gasPrice, 'gasPrice')
    const parsedMaxFeePerGas = normalizeRpcQuantity(payload.maxFeePerGas, 'maxFeePerGas')
    const parsedMaxPriorityFeePerGas = normalizeRpcQuantity(payload.maxPriorityFeePerGas, 'maxPriorityFeePerGas')
    const txTypeRaw = payload.type
    const txType = txTypeRaw === 2 || txTypeRaw === '2'
      ? 2
      : undefined
    if (txTypeRaw !== undefined && txType === undefined) {
      throw { code: -32602, message: 'wallet_sendTransaction only supports EVM transaction type 2' }
    }

    return {
      ...(to ? { to } : {}),
      value,
      data,
      ...(parsedGasLimit ? { gasLimit: parsedGasLimit } : {}),
      ...(parsedGasPrice ? { gasPrice: parsedGasPrice } : {}),
      ...(parsedMaxFeePerGas ? { maxFeePerGas: parsedMaxFeePerGas } : {}),
      ...(parsedMaxPriorityFeePerGas ? { maxPriorityFeePerGas: parsedMaxPriorityFeePerGas } : {}),
      ...(txType ? { type: txType } : {})
    }
  }

  const to = String(payload.to ?? payload.address ?? '').trim()
  if (!to) {
    throw { code: -32602, message: 'wallet_sendTransaction requires a recipient `to` address' }
  }

  const amount = normalizeDecimalCoinAmount(payload.amount ?? payload.value, maxDecimals, 'amount')
  if (!amount) {
    throw { code: -32602, message: 'wallet_sendTransaction requires `amount` as a decimal coin string' }
  }
  const memo = String(payload.memo ?? '').trim()

  return memo ? { to, amount, memo } : { to, amount }
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
  const memo = String(payload.memo ?? '').trim()

  if (!assetId) throw { code: -32602, message: 'wallet_sendAsset requires `assetId`' }
  if (!toAddress) throw { code: -32602, message: 'wallet_sendAsset requires recipient `toAddress`' }
  if (!qty) throw { code: -32602, message: 'wallet_sendAsset requires `qty` as a decimal string' }
  if (!/^\d+(\.\d+)?$/.test(qty)) throw { code: -32602, message: 'wallet_sendAsset qty must be a positive decimal string' }
  if (Number(qty) <= 0) throw { code: -32602, message: 'wallet_sendAsset qty must be greater than zero' }

  return memo ? { assetId, qty, toAddress, memo } : { assetId, qty, toAddress }
}

function buildNetworkHintAliases(network: DappNetworkEntry): { lowercase: string[]; uppercase: string[] } {
  const base = [
    String(network.id || '').trim(),
    String(network.runtimeModelId || '').trim(),
    String(network.name || '').trim(),
    String(network.symbol || '').trim()
  ].filter(Boolean)
  const id = String(network.id || '').trim().toLowerCase()
  const extra = COSMOS_CHAIN_ID_ALIASES[id] || []
  const aliasOverrides = id === 'rtm' || id === 'raptoreum'
    ? ['rtm', 'raptoreum']
    : []
  return {
    lowercase: Array.from(new Set([
      ...base.map((value) => value.toLowerCase()),
      ...extra.map((value) => value.toLowerCase()),
      ...aliasOverrides.map((value) => value.toLowerCase())
    ])),
    uppercase: Array.from(new Set(base.map((value) => value.toUpperCase())))
  }
}

function buildEvmReadRpcConfig(network: DappNetworkEntry): UtxoRpcConfig {
  const entry = network as DappNetworkEntry & Record<string, unknown>
  return {
    networkId: String(network.id || '').trim(),
    coinSymbol: String(network.symbol || '').trim(),
    rpcUrl: String(entry.rpcUrl || '').trim(),
    rpcWallet: String(entry.rpcWallet || '').trim() || undefined,
    rpcUsername: String(entry.rpcUsername || '').trim() || undefined,
    rpcPassword: String(entry.rpcPassword || '').trim() || undefined,
    bridgeUrl: String(entry.bridgeUrl || '').trim() || undefined,
    bridgeUsername: String(entry.bridgeUsername || '').trim() || undefined,
    bridgePassword: String(entry.bridgePassword || '').trim() || undefined,
    secureBridgeApiBaseUrl: String(entry.secureBridgeApiBaseUrl || '').trim() || undefined,
    secureBridgeWritesEnabled: Boolean(entry.secureBridgeWritesEnabled)
  }
}

function isReadOnlyEvmRpcMethod(method: string): boolean {
  const normalized = String(method || '').trim().toLowerCase()
  if (!normalized) return false
  if (normalized === 'net_version' || normalized === 'web3_clientversion') return true
  if (!normalized.startsWith('eth_')) return false
  return !EVM_WRITE_OR_SENSITIVE_RPC_METHODS.has(normalized)
}

function buildEvmPermissionResponse(origin: string, state: WalletState, networkId: string | undefined): Array<Record<string, unknown>> {
  const address = networkId ? getActiveAddressFromState(state, networkId) : null
  return [{
    invoker: origin,
    parentCapability: 'eth_accounts',
    ...(address ? {
      caveats: [{
        type: 'filterResponse',
        value: [address]
      }]
    } : {})
  }]
}

function buildAssetScopeKey(accountId: string, networkId: string): string {
  return `${String(accountId || '').trim().toLowerCase()}::${String(networkId || '').trim().toLowerCase()}`
}

function readScopedAssetMap(
  state: WalletState,
  accountId: string,
  networkId: string
): {
  assets: Record<string, number>
  labels: Record<string, string>
  logos: Record<string, string>
} {
  const scopeKey = buildAssetScopeKey(accountId, networkId)
  return {
    assets: state.accountNetworkAssets?.[scopeKey] || state.networkAssets?.[networkId] || {},
    labels: state.accountNetworkAssetLabels?.[scopeKey] || state.networkAssetLabels?.[networkId] || {},
    logos: state.accountNetworkAssetLogos?.[scopeKey] || state.networkAssetLogos?.[networkId] || {}
  }
}

function buildWalletAssetRows(
  state: WalletState,
  accountId: string,
  networkId: string
): Array<Record<string, unknown>> {
  const scoped = readScopedAssetMap(state, accountId, networkId)
  return Object.entries(scoped.assets)
    .map(([assetId, rawAmount]) => ({
      assetId,
      rawAmount: Number(rawAmount || 0),
      label: String(scoped.labels?.[assetId] || assetId).trim() || assetId,
      logo: String(scoped.logos?.[assetId] || '').trim() || undefined
    }))
    .sort((a, b) => Number(b.rawAmount || 0) - Number(a.rawAmount || 0))
}

function buildWalletAccountSnapshot(
  state: WalletState,
  network: DappNetworkEntry | undefined,
  accountId: string
): Record<string, unknown> {
  const account = state.accounts?.find((entry) => entry.id === accountId) || state.accounts?.[0]
  const networkId = String(network?.id || state.activeNetworkId || '').trim()
  const address = account ? getAccountAddressForNetwork(account, networkId, network?.coinType) : ''
  const balance = String(account?.networkBalances?.[networkId] || account?.balance || '0').trim() || '0'
  return {
    accountId: String(account?.id || '').trim() || null,
    name: String(account?.name || '').trim() || null,
    kind: String(account?.kind || '').trim() || null,
    derivationIndex: Number.isInteger((account as any)?.derivationIndex) ? Number((account as any).derivationIndex) : 0,
    networkId: networkId || null,
    coinType: String(network?.coinType || '').trim() || null,
    address: address || null,
    balance,
    assets: account ? buildWalletAssetRows(state, account.id, networkId) : []
  }
}

function parseAddEthereumChainPayload(params: unknown): Network | null {
  const payload = (Array.isArray(params) ? params[0] : params) as Record<string, unknown> | null
  if (!payload || typeof payload !== 'object') return null
  const rawChainId = (payload as Record<string, unknown>).chainId
  const chainId = parseRequestedChainId(rawChainId)
  if (chainId === null) return null
  const rpcUrls = Array.isArray(payload.rpcUrls) ? payload.rpcUrls.map((entry) => String(entry || '').trim()).filter(Boolean) : []
  const chainName = String(payload.chainName || '').trim()
  const nativeCurrency = (payload.nativeCurrency && typeof payload.nativeCurrency === 'object')
    ? payload.nativeCurrency as Record<string, unknown>
    : null
  const symbol = String(nativeCurrency?.symbol || payload.symbol || chainName || `EVM ${chainId}`).trim() || `EVM ${chainId}`
  const name = chainName || String(nativeCurrency?.name || symbol).trim() || `EVM Chain ${chainId}`
  const networkId = `evm-${chainId}`
  return {
    id: networkId,
    runtimeModelId: 'eth',
    serverCoinId: `custom-evm-${chainId}`,
    serverChain: 'main',
    displayChain: 'main',
    name,
    symbol,
    coinType: 'EVM',
    chainId,
    rpcUrl: rpcUrls[0] || '',
    explorerUrl: Array.isArray(payload.blockExplorerUrls) ? String(payload.blockExplorerUrls[0] || '').trim() || undefined : undefined,
    coinSymbol: symbol,
    supportsAssets: true,
    capabilities: {
      features: {
        nativeSend: true,
        assetLayer: true,
        assetSend: true,
        activity: true,
        swap: true
      },
      ui: {
        showAssetsTab: true,
        showAssetsAction: true,
        showSendAction: true,
        showActivityTab: true,
        showSwapAction: true
      }
    }
  }
}

function parseWatchAssetPayload(params: unknown): {
  assetId: string
  label: string
  logo?: string
} | null {
  const payload = (Array.isArray(params) ? params[0] : params) as Record<string, unknown> | null
  if (!payload || typeof payload !== 'object') return null
  const type = String(payload.type || '').trim().toUpperCase()
  const options = payload.options && typeof payload.options === 'object' ? payload.options as Record<string, unknown> : payload
  const address = String(options.address || '').trim()
  if (!address) return null
  if (type && type !== 'ERC20') return null
  const symbol = String(options.symbol || '').trim()
  const image = String(options.image || '').trim()
  return {
    assetId: `EVMTOKEN:${address}`,
    label: symbol || address,
    ...(image ? { logo: image } : {})
  }
}

function parseRtmMarketActionParams(params: unknown): RtmMarketActionParams {
  const candidate = Array.isArray(params) ? params[0] : params
  if (!candidate || typeof candidate !== 'object') {
    throw { code: -32602, message: 'wallet_rtmMarketAction requires an action payload' }
  }

  const payload = candidate as Record<string, unknown>
  const version = Number(payload.version ?? 0)
  const kind = String(payload.kind ?? '').trim()
  const orderId = String(payload.orderId ?? '').trim()
  const listingId = String(payload.listingId ?? '').trim()
  const networkId = String(payload.networkId ?? '').trim()

  if (version !== 1) throw { code: -32602, message: 'wallet_rtmMarketAction requires version 1' }
  if (!kind) throw { code: -32602, message: 'wallet_rtmMarketAction requires `kind`' }
  if (networkId !== 'rtm') throw { code: -32602, message: 'wallet_rtmMarketAction is only supported on RTM' }
  if (!RTM_ORDER_MARKET_ACTION_KINDS.has(kind) && !RTM_LISTING_MARKET_ACTION_KINDS.has(kind)) {
    throw { code: -32602, message: `wallet_rtmMarketAction does not support kind \`${kind}\`` }
  }
  if (RTM_ORDER_MARKET_ACTION_KINDS.has(kind) && !orderId) {
    throw { code: -32602, message: 'wallet_rtmMarketAction requires `orderId` for order actions' }
  }
  if (RTM_LISTING_MARKET_ACTION_KINDS.has(kind) && !listingId) {
    throw { code: -32602, message: 'wallet_rtmMarketAction requires `listingId` for listing actions' }
  }
  if (orderId && listingId) {
    throw { code: -32602, message: 'wallet_rtmMarketAction accepts either `orderId` or `listingId`, not both' }
  }

  return payload as RtmMarketActionParams
}

function parseRtmIssuerActionParams(params: unknown): RtmIssuerActionParams {
  const candidate = Array.isArray(params) ? params[0] : params
  if (!candidate || typeof candidate !== 'object') {
    throw { code: -32602, message: 'wallet_rtmIssuerAction requires an action payload' }
  }

  const payload = candidate as Record<string, unknown>
  const version = Number(payload.version ?? 0)
  const kind = String(payload.kind ?? '').trim()
  const draftId = String(payload.draftId ?? '').trim()
  const networkId = String(payload.networkId ?? '').trim()

  if (version !== 1) throw { code: -32602, message: 'wallet_rtmIssuerAction requires version 1' }
  if (!kind) throw { code: -32602, message: 'wallet_rtmIssuerAction requires `kind`' }
  if (!draftId) throw { code: -32602, message: 'wallet_rtmIssuerAction requires `draftId`' }
  if (networkId !== 'rtm') throw { code: -32602, message: 'wallet_rtmIssuerAction is only supported on RTM' }

  return payload as RtmIssuerActionParams
}

function parseSignMessageParams(params: unknown): {
  ecosystem: 'evm' | 'solana' | 'rtm'
  address?: string
  message?: string
  messageBase64?: string
  encoding?: 'utf8' | 'hex'
} {
  if (Array.isArray(params) && params.length >= 2) {
    const [first, second] = params
    const firstText = String(first ?? '').trim()
    const secondText = String(second ?? '').trim()
    const firstLooksAddress = /^0x[0-9a-f]{40}$/i.test(firstText)
    const message = firstLooksAddress ? secondText : firstText
    return {
      ecosystem: 'evm',
      message,
      encoding: /^0x[0-9a-f]*$/i.test(message) ? 'hex' : 'utf8'
    }
  }

  const candidate = Array.isArray(params) ? params[0] : params
  if (!candidate || typeof candidate !== 'object') {
    throw { code: -32602, message: 'wallet_signMessage requires message params' }
  }

  const payload = candidate as Record<string, unknown>
  const ecosystem = String(payload.ecosystem || '').trim().toLowerCase() === 'solana' ? 'solana' : 'evm'
  if (ecosystem === 'solana') {
    const messageBase64 = String(payload.messageBase64 || '').trim()
    if (!messageBase64) {
      throw { code: -32602, message: 'wallet_signMessage requires `messageBase64` for Solana payloads' }
    }
    return { ecosystem, messageBase64 }
  }

  const message = String(payload.message ?? payload.data ?? '').trim()
  if (!message) {
    throw { code: -32602, message: 'wallet_signMessage requires `message`' }
  }
  return {
    ecosystem,
    message,
    encoding: String(payload.encoding || '').trim().toLowerCase() === 'hex' || /^0x[0-9a-f]*$/i.test(message) ? 'hex' : 'utf8'
  }
}

function parseRtmSignMessageParams(params: unknown): {
  ecosystem: 'rtm'
  address?: string
  message: string
} {
  if (Array.isArray(params)) {
    const address = String(params[0] ?? '').trim()
    const message = String(params[1] ?? '').trim()
    if (!message) {
      throw { code: -32602, message: 'wallet_rtmSignMessage requires [address, message]' }
    }
    return { ecosystem: 'rtm', address: address || undefined, message }
  }

  const candidate = params && typeof params === 'object' ? params : null
  if (!candidate) {
    throw { code: -32602, message: 'wallet_rtmSignMessage requires an RTM message payload' }
  }
  const payload = candidate as Record<string, unknown>
  const message = String(payload.message ?? '').trim()
  if (!message) {
    throw { code: -32602, message: 'wallet_rtmSignMessage requires `message`' }
  }
  const address = String(payload.address ?? '').trim()
  return { ecosystem: 'rtm', address: address || undefined, message }
}

function resolveDappMethodMatrix(network?: DappNetworkEntry | null): DappMethodMatrix {
  const methods = new Set<string>([
    'wallet_getProviderState',
    'metayoshi_getProviderState',
    'rtm_getProviderState',
    'wallet_getAccount',
    'metayoshi_getAccount',
    'rtm_getAccount',
    'wallet_getBalance',
    'metayoshi_getBalance',
    'rtm_getBalance',
    'wallet_getAssetBalances',
    'metayoshi_getAssetBalances',
    'rtm_getAssetBalances',
    'wallet_getPortfolio',
    'metayoshi_getPortfolio',
    'rtm_getPortfolio',
    'wallet_requestAccounts',
    'metayoshi_requestAccounts',
    'rtm_requestAccounts',
    'wallet_accounts',
    'metayoshi_accounts',
    'rtm_accounts',
    'wallet_connect',
    'metayoshi_connect',
    'rtm_connect',
    'wallet_selectAccount',
    'metayoshi_selectAccount',
    'rtm_selectAccount',
    'wallet_switchNetwork',
    'metayoshi_switchNetwork',
    'rtm_switchNetwork',
    'wallet_getNetworks',
    'metayoshi_getNetworks',
    'rtm_getNetworks',
    'wallet_getCapabilities',
    'metayoshi_getCapabilities',
    'rtm_getCapabilities',
    'wallet_sendTransaction',
    'metayoshi_sendTransaction',
    'rtm_sendTransaction',
    'wallet_sendAsset',
    'metayoshi_sendAsset',
    'rtm_sendAsset',
    'wallet_rtmMarketAction',
    'wallet_rtmIssuerAction',
    'wallet_rtmGetPublicKey'
  ])
  const protocol = resolveDappProtocol(network)
  const matrix: DappMethodMatrix = {
    signMessage: false,
    signTypedData: false,
    signTransaction: false,
    signAllTransactions: false,
    signAndSendTransaction: false,
    cosmosGetKey: false,
    cosmosSignDirect: false,
    cosmosSignAmino: false,
    cosmosSendTx: false,
    methods: []
  }

  if (protocol === 'evm-jsonrpc') {
    matrix.signMessage = true
    matrix.signTypedData = true
    matrix.signTransaction = true
    matrix.signAndSendTransaction = true
    ;[
      'wallet_signMessage',
      'wallet_signTypedData',
      'wallet_signTransaction',
      'wallet_signAndSendTransaction',
      'eth_accounts',
      'eth_requestAccounts',
      'eth_chainId',
      'wallet_getPermissions',
      'wallet_requestPermissions',
      'wallet_revokePermissions',
      'wallet_switchEthereumChain',
      'wallet_addEthereumChain',
      'wallet_watchAsset',
      'eth_sendTransaction',
      'eth_signTransaction',
      'personal_sign',
      'eth_sign',
      'eth_signTypedData',
      'eth_signTypedData_v3',
      'eth_signTypedData_v4'
    ].forEach((method) => methods.add(method))
  } else if (protocol === 'solana-jsonrpc') {
    matrix.signMessage = true
    matrix.signTransaction = true
    matrix.signAllTransactions = true
    matrix.signAndSendTransaction = true
    ;[
      'wallet_signMessage',
      'wallet_signTransaction',
      'wallet_signAllTransactions',
      'wallet_signAndSendTransaction'
    ].forEach((method) => methods.add(method))
  } else if (protocol === 'rtm-jsonrpc') {
    matrix.signMessage = true
    ;[
      'wallet_rtmSignMessage',
      'wallet_rtmGetPublicKey'
    ].forEach((method) => methods.add(method))
  } else if (protocol === 'cosmos-rest-bridge') {
    matrix.cosmosGetKey = true
    matrix.cosmosSignDirect = true
    matrix.cosmosSignAmino = true
    matrix.cosmosSendTx = true
    ;[
      'wallet_cosmosGetKey',
      'wallet_cosmosSignDirect',
      'wallet_cosmosSignAmino',
      'wallet_cosmosSendTx'
    ].forEach((method) => methods.add(method))
  }

  matrix.methods = [...methods]
  return matrix
}

function parseSignTypedDataParams(params: unknown): { typedData: unknown } {
  const payload = Array.isArray(params)
    ? (params.length >= 2 ? params[1] : params[0])
    : params
  if (payload === undefined || payload === null) {
    throw { code: -32602, message: 'wallet_signTypedData requires typed data params' }
  }
  return { typedData: payload }
}

function parseEvmTransactionRequest(params: unknown): { tx: Record<string, unknown> } {
  const candidate = Array.isArray(params) ? params[0] : params
  if (!candidate || typeof candidate !== 'object') {
    throw { code: -32602, message: 'eth_sendTransaction requires a transaction object' }
  }
  return { tx: candidate as Record<string, unknown> }
}

function parseSignTransactionParams(params: unknown): { ecosystem: 'evm' | 'solana'; tx?: Record<string, unknown>; serializedTxBase64?: string } {
  const candidate = Array.isArray(params) ? params[0] : params
  if (!candidate || typeof candidate !== 'object') {
    throw { code: -32602, message: 'wallet_signTransaction requires params' }
  }
  const payload = candidate as Record<string, unknown>
  const ecosystem = String(payload.ecosystem || '').trim().toLowerCase() === 'solana' ? 'solana' : 'evm'
  if (ecosystem === 'solana') {
    const serializedTxBase64 = String(payload.serializedTxBase64 || '').trim()
    if (!serializedTxBase64) throw { code: -32602, message: 'wallet_signTransaction requires `serializedTxBase64` for Solana payloads' }
    return { ecosystem, serializedTxBase64 }
  }
  return { ecosystem, tx: payload.tx && typeof payload.tx === 'object' ? payload.tx as Record<string, unknown> : payload }
}

function parseSignAllTransactionsParams(params: unknown): { ecosystem: 'solana'; serializedTxsBase64: string[] } {
  const candidate = Array.isArray(params) ? params[0] : params
  if (!candidate || typeof candidate !== 'object') {
    throw { code: -32602, message: 'wallet_signAllTransactions requires params' }
  }
  const payload = candidate as Record<string, unknown>
  const serializedTxsBase64 = Array.isArray(payload.serializedTxsBase64)
    ? payload.serializedTxsBase64.map((entry) => String(entry || '').trim()).filter(Boolean)
    : []
  if (serializedTxsBase64.length === 0) {
    throw { code: -32602, message: 'wallet_signAllTransactions requires `serializedTxsBase64`' }
  }
  return { ecosystem: 'solana', serializedTxsBase64 }
}

function parseSignAndSendTransactionParams(params: unknown): { ecosystem: 'solana'; serializedTxBase64: string } {
  const candidate = Array.isArray(params) ? params[0] : params
  if (!candidate || typeof candidate !== 'object') {
    throw { code: -32602, message: 'wallet_signAndSendTransaction requires params' }
  }
  const payload = candidate as Record<string, unknown>
  const serializedTxBase64 = String(payload.serializedTxBase64 || '').trim()
  if (!serializedTxBase64) {
    throw { code: -32602, message: 'wallet_signAndSendTransaction requires `serializedTxBase64`' }
  }
  return { ecosystem: 'solana', serializedTxBase64 }
}

function parseCosmosSignDirectParams(params: unknown): { signDoc: any } {
  const candidate = Array.isArray(params) ? params[0] : params
  if (!candidate || typeof candidate !== 'object') {
    throw { code: -32602, message: 'wallet_cosmosSignDirect requires params' }
  }
  const payload = candidate as Record<string, unknown>
  if (!payload.signDoc || typeof payload.signDoc !== 'object') {
    throw { code: -32602, message: 'wallet_cosmosSignDirect requires `signDoc`' }
  }
  return { signDoc: payload.signDoc }
}

function parseCosmosSignAminoParams(params: unknown): { signDoc: any } {
  const candidate = Array.isArray(params) ? params[0] : params
  if (!candidate || typeof candidate !== 'object') {
    throw { code: -32602, message: 'wallet_cosmosSignAmino requires params' }
  }
  const payload = candidate as Record<string, unknown>
  if (!payload.signDoc || typeof payload.signDoc !== 'object') {
    throw { code: -32602, message: 'wallet_cosmosSignAmino requires `signDoc`' }
  }
  return { signDoc: payload.signDoc }
}

function parseCosmosSendTxParams(params: unknown): { txBytesBase64: string; mode?: 'BROADCAST_MODE_SYNC' | 'BROADCAST_MODE_ASYNC' | 'BROADCAST_MODE_BLOCK' } {
  const candidate = Array.isArray(params) ? params[0] : params
  if (!candidate || typeof candidate !== 'object') {
    throw { code: -32602, message: 'wallet_cosmosSendTx requires params' }
  }
  const payload = candidate as Record<string, unknown>
  const txBytesBase64 = String(payload.txBytesBase64 || payload.tx || '').trim()
  if (!txBytesBase64) {
    throw { code: -32602, message: 'wallet_cosmosSendTx requires `txBytesBase64`' }
  }
  const modeRaw = String(payload.mode || '').trim().toUpperCase()
  const mode = modeRaw === 'BROADCAST_MODE_BLOCK' || modeRaw === 'BROADCAST_MODE_ASYNC' || modeRaw === 'BROADCAST_MODE_SYNC'
    ? modeRaw as 'BROADCAST_MODE_SYNC' | 'BROADCAST_MODE_ASYNC' | 'BROADCAST_MODE_BLOCK'
    : undefined
  return { txBytesBase64, ...(mode ? { mode } : {}) }
}

async function requestDappActionApproval(
  origin: string,
  networkId: string,
  accountId: string,
  method: DappRequestMethod,
  request: DappKnownRequestPayload,
  surfaceTarget?: ExtensionSurfaceTarget
): Promise<unknown> {
  const actionKey = [
    normalizeDappOrigin(origin),
    networkId,
    accountId,
    method,
    stableStringifyForComparison(request)
  ].join('|')
  const inFlight = inFlightActionApprovals.get(actionKey)
  if (inFlight) return await inFlight

  const pendingPromise = (async () => {
  const normalizedOrigin = normalizeDappOrigin(origin)
  if (!normalizedOrigin || normalizedOrigin === 'unknown') {
    throw { code: 4001, message: 'Untrusted origin' }
  }

  const now = Date.now()
  const pending = await getPendingRequest()
  const pendingRequestActive =
    Boolean(pending)
    && (pending?.status === 'pending' || pending?.status === 'approved')
    && pending.expiresAt > now

  if (pending && pendingRequestActive) {
    const sameRequest =
      pending.origin === normalizedOrigin
      && pending.networkId === networkId
      && pending.accountId === accountId
      && pending.method === method
      && areRequestsEquivalent(pending.request, request)

    if (sameRequest) {
      void recordBridgeTrace('background-sw', 'request-approval-reuse', {
        requestId: pending.id,
        origin: normalizedOrigin,
        method,
        status: pending.status
      })
      if (pending.status === 'pending') {
        try {
          await openRequestSurface(pending.id, pending.method, surfaceTarget)
        } catch (err) {
          void recordRuntimeError('background-sw', err, {
            kind: 'open-request-surface-reuse',
            requestId: pending.id,
            origin: normalizedOrigin,
            method: pending.method
          })
          throw err
        }
      }
      const decision = await waitForRequestDecision(
        pending.id,
        getPendingTimeoutMs(pending.expiresAt, DAPP_APPROVAL_TIMEOUT_MS)
      )
      if (decision.decision === 'executed' && decision.result) {
        await clearPendingRequestIfMatch(pending.id)
        return decision.result
      }
      await clearPendingRequestIfMatch(pending.id)
      if (decision.decision === 'rejected' || decision.decision === 'timeout') {
        throw { code: 4001, message: 'User rejected the request' }
      }
      throw {
        code: decision.error?.code ?? -32603,
        message: decision.error?.message ?? 'Transaction failed'
      }
    }
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
  void recordBridgeTrace('background-sw', 'request-approval-created', {
    requestId,
    origin: normalizedOrigin,
    method,
    networkId,
    accountId,
    request: summarizeTraceValue(request)
  })

  try {
    await openRequestSurface(requestId, method, surfaceTarget)
  } catch (err) {
    void recordRuntimeError('background-sw', err, {
      kind: 'open-request-surface',
      requestId,
      origin: normalizedOrigin,
      method
    })
    await clearPendingRequestIfMatch(requestId)
    throw err
  }

  const decision = await waitForRequestDecision(requestId, DAPP_APPROVAL_TIMEOUT_MS)
  void recordBridgeTrace('background-sw', 'request-approval-decision', {
    requestId,
    decision: decision.decision,
    errorCode: decision.error?.code,
    errorMessage: decision.error?.message
  })
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
  })()

  inFlightActionApprovals.set(actionKey, pendingPromise)
  try {
    return await pendingPromise
  } finally {
    inFlightActionApprovals.delete(actionKey)
  }
}

// Request scope permission(s) in a single approval view.
async function requestScopes(
  origin: string,
  scopes: DappScope[],
  options?: { networkId?: string; surfaceTarget?: ExtensionSurfaceTarget }
): Promise<boolean> {
  const scopeKey = [
    normalizeDappOrigin(origin),
    uniqDappScopes(scopes).sort().join(','),
    String(options?.networkId || '').trim()
  ].join('|')
  const inFlight = inFlightScopeRequests.get(scopeKey)
  if (inFlight) return await inFlight

  const pendingPromise = (async () => {
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
  const reuseExistingApproval =
    Boolean(pending)
    && pending?.status === 'pending'
    && pending?.origin === normalizedOrigin
    && pending.expiresAt > now

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
    networkId: String(options?.networkId || '').trim() || undefined,
    status: 'pending',
    requestedAt: pending?.origin === normalizedOrigin ? pending.requestedAt : now,
    updatedAt: now,
    expiresAt: now + DAPP_APPROVAL_TIMEOUT_MS
  }

  await setPendingApproval(nextPending)
  void recordBridgeTrace('background-sw', 'scope-approval-upsert', {
    approvalId,
    origin: normalizedOrigin,
    scopes: nextPending.scopes,
    networkId: nextPending.networkId,
    reused: reuseExistingApproval
  })

  try {
    await openApprovalSurface(options?.surfaceTarget)
  } catch (err) {
    void recordRuntimeError('background-sw', err, {
      kind: 'open-approval-surface',
      approvalId,
      origin: normalizedOrigin,
      scopes: nextPending.scopes,
      networkId: nextPending.networkId
    })
  }

  const decision = await waitForApprovalDecision(
    approvalId,
    reuseExistingApproval
      ? getPendingTimeoutMs(nextPending.expiresAt, DAPP_APPROVAL_TIMEOUT_MS)
      : DAPP_APPROVAL_TIMEOUT_MS
  )
  void recordBridgeTrace('background-sw', 'scope-approval-decision', {
    approvalId,
    origin: normalizedOrigin,
    decision
  })
  if (decision !== 'approved') {
    await clearPendingApprovalIfMatch(approvalId)
    return false
  }

  await grantScopes(normalizedOrigin, nextPending.scopes)
  await clearPendingApprovalIfMatch(approvalId)
  return true
  })()

  inFlightScopeRequests.set(scopeKey, pendingPromise)
  try {
    return await pendingPromise
  } finally {
    inFlightScopeRequests.delete(scopeKey)
  }
}

// Request one scope helper
async function requestScope(origin: string, scope: DappScope): Promise<boolean> {
  return requestScopes(origin, [scope])
}

type DappRuntimeContext = {
  state: WalletState
  dappNetworks: DappNetworkEntry[]
  network: DappNetworkEntry | undefined
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

function buildDappRuntimeContext(state: WalletState, requestedNetworkId?: string): DappRuntimeContext {
  const dappNetworks = resolveDappNetworks(state)
  const normalizedRequestedNetworkId = String(requestedNetworkId || '').trim()
  const explicitlyRequestedNetwork = dappNetworks.find((n) => n.id === normalizedRequestedNetworkId)
  const preferredNetwork = explicitlyRequestedNetwork
    || dappNetworks.find((n) => n.id === state.activeNetworkId)
    || dappNetworks[0]
  const preferredNetworkId = preferredNetwork?.id || DEFAULT_NETWORK_ID
  const preferredAddress = getActiveAddressFromState(state, preferredNetworkId)
  // If the requested or active network has no address for the selected account,
  // fall back to the first network that does. This keeps connect flows usable
  // when a dapp hints one network but the current account only has another.
  const network = preferredAddress
    ? preferredNetwork
    : findFirstNetworkWithActiveAddress(state, dappNetworks) || preferredNetwork
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

function redactProviderState(providerState: DappRuntimeContext['providerState']): DappRuntimeContext['providerState'] {
  return {
    ...providerState,
    connected: false,
    unlocked: false,
    accounts: [],
    selectedAddress: null
  }
}

async function canExposeAccountsToOrigin(origin: string | null): Promise<boolean> {
  if (!origin) return false
  return hasScope(origin, 'read')
}

async function buildProviderStateForOrigin(
  origin: string | null,
  runtime: DappRuntimeContext
): Promise<DappRuntimeContext['providerState']> {
  if (await canExposeAccountsToOrigin(origin)) {
    return runtime.providerState
  }
  return redactProviderState(runtime.providerState)
}

// Handle RPC methods
async function handleRpcMethod(
  method: string,
  params: any,
  origin?: string,
  surfaceTarget?: ExtensionSurfaceTarget
): Promise<any> {
  const normalizedOrigin = origin ? normalizeDappOrigin(origin) : null
  if (normalizedOrigin && isBlockedInternalDappOrigin(normalizedOrigin)) {
    throw { code: 4001, message: DAPP_BLOCKED_INTERNAL_ORIGIN_MESSAGE }
  }

  const walletState = await getWalletState()
  const dappNetworks = resolveDappNetworks(walletState)
  const requestedNetwork = resolveRequestedDappNetwork(dappNetworks, params)
  if (requestedNetwork.hintProvided && !requestedNetwork.network) {
    throw {
      code: -32602,
      message: `Unsupported network for MetaYoshi DApp SDK: ${requestedNetwork.hintSummary || 'unknown'}`
    }
  }

  let runtimeNetworkId = requestedNetwork.network?.id
  if (!runtimeNetworkId && (
    ETHEREUM_ACCOUNTS_METHODS.has(method)
    || ETHEREUM_REQUEST_ACCOUNTS_METHODS.has(method)
    || ETHEREUM_CHAIN_ID_METHODS.has(method)
    || ETHEREUM_GET_PERMISSIONS_METHODS.has(method)
    || ETHEREUM_REQUEST_PERMISSIONS_METHODS.has(method)
    || ETHEREUM_REVOKE_PERMISSIONS_METHODS.has(method)
    || ETHEREUM_SWITCH_CHAIN_METHODS.has(method)
    || ETHEREUM_ADD_CHAIN_METHODS.has(method)
    || ETHEREUM_WATCH_ASSET_METHODS.has(method)
    || ETHEREUM_SEND_TRANSACTION_METHODS.has(method)
    || ETHEREUM_SIGN_TRANSACTION_METHODS.has(method)
    || ETHEREUM_SIGN_METHODS.has(method)
    || ETHEREUM_SIGN_TYPED_DATA_METHODS.has(method)
    || isReadOnlyEvmRpcMethod(method)
  )) {
    runtimeNetworkId = findNetworkByCoinType(walletState, 'EVM')?.id
  }
  if (!runtimeNetworkId && (
    SIGN_TRANSACTION_METHODS.has(method)
    || SIGN_ALL_TRANSACTIONS_METHODS.has(method)
    || SIGN_AND_SEND_TRANSACTION_METHODS.has(method)
  )) {
    runtimeNetworkId = findNetworkByRuntimeModel(walletState, 'sol')?.id || findNetworkByCoinType(walletState, 'SOL')?.id
  }
  if (!runtimeNetworkId && (
    COSMOS_GET_KEY_METHODS.has(method)
    || COSMOS_SIGN_DIRECT_METHODS.has(method)
    || COSMOS_SIGN_AMINO_METHODS.has(method)
    || COSMOS_SEND_TX_METHODS.has(method)
  )) {
    runtimeNetworkId = findNetworkByCoinType(walletState, 'COSMOS')?.id || findNetworkByRuntimeModel(walletState, 'cosmos')?.id
  }

  const runtime = buildDappRuntimeContext(walletState, runtimeNetworkId)
  const {
    state,
    network,
    effectiveNetworkId,
    address,
    connected,
    unlocked,
    providerState
  } = runtime
  
  // Provider state methods
  if (PROVIDER_STATE_METHODS.has(method)) {
    return buildProviderStateForOrigin(normalizedOrigin, runtime)
  }

  if (OPEN_WALLET_METHODS.has(method)) {
    await openWalletSurface(surfaceTarget)
    const refreshed = buildDappRuntimeContext(await getWalletState(), network?.id)
    return buildProviderStateForOrigin(normalizedOrigin, refreshed)
  }

  if (CONNECT_METHODS.has(method)) {
    if (origin) {
      const approved = await requestScopes(origin, ['read'], { networkId: effectiveNetworkId, surfaceTarget })
      if (!approved) {
        throw { code: 4001, message: 'User rejected the request' }
      }
      await touchLastConnected(origin)
    }

    const refreshed = buildDappRuntimeContext(await getWalletState(), network?.id)
    if (!(refreshed.state.isInitialized ?? false) || !(refreshed.state.hasVault ?? false)) {
      throw { code: -32603, message: 'Wallet is not initialized' }
    }
    if (!refreshed.address) {
      throw { code: -32603, message: 'No account available' }
    }
    return refreshed.providerState
  }

  if (CAPABILITIES_METHODS.has(method)) {
    const netCaps = resolveNetworkCapabilities(network || {})
    const methodMatrix = resolveDappMethodMatrix(network)
    const activeAccount = getActiveAccountFromState(state)
    const multisigActive = isMultisigAccount(activeAccount)
    const advertisedMethods = multisigActive
      ? methodMatrix.methods.filter((entry) => !(
          SIGN_MESSAGE_METHODS.has(entry)
          || ETHEREUM_SIGN_METHODS.has(entry)
          || SIGN_TYPED_DATA_METHODS.has(entry)
          || ETHEREUM_SIGN_TYPED_DATA_METHODS.has(entry)
          || SIGN_TRANSACTION_METHODS.has(entry)
          || SIGN_ALL_TRANSACTIONS_METHODS.has(entry)
          || SIGN_AND_SEND_TRANSACTION_METHODS.has(entry)
        ))
      : methodMatrix.methods
    const features = {
      nativeSend: multisigActive ? false : Boolean(netCaps.features.nativeSend),
      signMessage: multisigActive ? false : Boolean(
        methodMatrix.signMessage
        || methodMatrix.signTypedData
        || methodMatrix.signTransaction
        || methodMatrix.signAllTransactions
        || methodMatrix.signAndSendTransaction
        || methodMatrix.cosmosGetKey
        || methodMatrix.cosmosSignDirect
        || methodMatrix.cosmosSignAmino
      ),
      assetLayer: multisigActive ? false : Boolean(netCaps.features.assetLayer),
      assetSend: multisigActive ? false : Boolean(netCaps.features.assetSend)
    }
    return {
      wallet: { isMetaYoshi: true, connected, unlocked },
      network: {
        id: network?.id || null,
        runtimeModelId: String((network as any)?.runtimeModelId || '').trim() || null,
        name: network?.name || null,
        symbol: network?.symbol || null,
        coinType: network?.coinType || null
      },
      features,
      scopes: {
        read: true,
        sign: features.signMessage,
        send_coin: features.nativeSend,
        send_asset: features.assetSend,
        select_account: true,
        switch_network: true
      },
      methods: advertisedMethods,
      networks: dappNetworks.map((n) => buildDappNetworkDescriptor(n, n.id === effectiveNetworkId))
    }
  }

  if (NETWORKS_METHODS.has(method)) {
    return dappNetworks.map((n) => buildDappNetworkDescriptor(n, n.id === effectiveNetworkId))
  }

  if (ACCOUNT_INFO_METHODS.has(method)) {
    await requireDappScopes(origin, ['read'])
    const activeAccount = getActiveAccountFromState(state)
    if (!(state.isInitialized ?? false) || !(state.hasVault ?? false) || !activeAccount) {
      throw { code: -32603, message: 'No account available' }
    }
    return buildWalletAccountSnapshot(state, network, activeAccount.id)
  }

  if (BALANCE_METHODS.has(method)) {
    await requireDappScopes(origin, ['read'])
    const activeAccount = getActiveAccountFromState(state)
    if (!(state.isInitialized ?? false) || !(state.hasVault ?? false) || !activeAccount) {
      throw { code: -32603, message: 'No account available' }
    }
    const snapshot = buildWalletAccountSnapshot(state, network, activeAccount.id)
    return {
      networkId: snapshot.networkId,
      address: snapshot.address,
      balance: snapshot.balance,
      symbol: network?.symbol || null
    }
  }

  if (ASSET_BALANCES_METHODS.has(method)) {
    await requireDappScopes(origin, ['read'])
    const activeAccount = getActiveAccountFromState(state)
    if (!(state.isInitialized ?? false) || !(state.hasVault ?? false) || !activeAccount) {
      throw { code: -32603, message: 'No account available' }
    }
    return buildWalletAssetRows(state, activeAccount.id, effectiveNetworkId)
  }

  if (PORTFOLIO_METHODS.has(method)) {
    await requireDappScopes(origin, ['read'])
    const activeAccount = getActiveAccountFromState(state)
    if (!(state.isInitialized ?? false) || !(state.hasVault ?? false) || !activeAccount) {
      throw { code: -32603, message: 'No account available' }
    }
    const snapshot = buildWalletAccountSnapshot(state, network, activeAccount.id)
    return {
      wallet: {
        connected,
        unlocked,
        origin: normalizedOrigin
      },
      network: {
        id: network?.id || null,
        name: network?.name || null,
        symbol: network?.symbol || null,
        coinType: network?.coinType || null,
        runtimeModelId: String((network as any)?.runtimeModelId || '').trim() || null
      },
      account: snapshot
    }
  }
  
  // Request accounts / enable
  if (REQUEST_ACCOUNTS_METHODS.has(method)) {
    if (origin) {
      const approved = await requestScopes(origin, ['read'], { networkId: effectiveNetworkId, surfaceTarget })
      if (!approved) {
        throw { code: 4001, message: 'User rejected the request' }
      }
      await touchLastConnected(origin)
    }

    const refreshed = buildDappRuntimeContext(await getWalletState(), network?.id)
    if (!(refreshed.state.isInitialized ?? false) || !(refreshed.state.hasVault ?? false)) {
      throw { code: -32603, message: 'Wallet is not initialized' }
    }
    if (!refreshed.address) {
      throw { code: -32603, message: 'No account available' }
    }

    return [refreshed.address]
  }
  
  // Get accounts
  if (ACCOUNTS_METHODS.has(method)) {
    if (!(await canExposeAccountsToOrigin(normalizedOrigin))) {
      return []
    }
    if ((state.isLocked ?? true) || !(state.isInitialized ?? false)) {
      return []
    }

    const currentAddress = getActiveAddressFromState(state, effectiveNetworkId)
    return currentAddress ? [currentAddress] : []
  }

  if (RTM_GET_PUBLIC_KEY_METHODS.has(method)) {
    const approvedOrigin = await requireDappScopes(origin, ['read', 'sign'])
    if (!(state.isInitialized ?? false) || !(state.hasVault ?? false)) {
      throw { code: -32603, message: 'Wallet is not initialized' }
    }
    if ((state.isLocked ?? true)) {
      throw { code: -32603, message: 'Wallet is locked' }
    }
    const rtmNetwork = resolveDappNetworks(state).find((entry) => String(entry.id || '').trim() === 'rtm')
    if (!rtmNetwork) {
      throw { code: 4900, message: 'RTM network is not available' }
    }
    const activeAccount = getActiveAccountFromState(state)
    if (!activeAccount) {
      throw { code: -32603, message: 'No account available' }
    }
    if (isMultisigAccount(activeAccount)) {
      throwUnsupportedMultisigMethod(method)
    }
    const mnemonic = String((state as any).sessionMnemonic || '').trim()
    if (!mnemonic) {
      throw { code: -32603, message: 'Wallet is locked' }
    }
    const accountIndex = Number.isInteger((activeAccount as any)?.derivationIndex)
      ? Number((activeAccount as any).derivationIndex)
      : Math.max(0, (state.accounts || []).findIndex((entry) => entry.id === activeAccount.id))
    const derived = await deriveUtxoAddress(mnemonic, 'RTM', accountIndex)
    const currentAddress = String(getActiveAddressFromState(state, 'rtm') || '').trim()
    if (currentAddress && currentAddress !== derived.address) {
      throw { code: -32603, message: 'Active RTM signer does not match the selected account' }
    }
    await touchLastConnected(approvedOrigin)
    return await requestDappActionApproval(
      approvedOrigin,
      'rtm',
      activeAccount.id,
      'wallet_rtmGetPublicKey',
      { networkId: 'rtm', address: derived.address },
      surfaceTarget
    )
  }

  if (ETHEREUM_CHAIN_ID_METHODS.has(method)) {
    if (!network || network.coinType !== 'EVM') {
      throw { code: 4900, message: 'No EVM network is available' }
    }
    return `0x${Number(network.chainId || 0).toString(16)}`
  }

  if (ETHEREUM_GET_PERMISSIONS_METHODS.has(method)) {
    if (!normalizedOrigin || !(await canExposeAccountsToOrigin(normalizedOrigin))) {
      return []
    }
    if (!network || network.coinType !== 'EVM') {
      return []
    }
    return buildEvmPermissionResponse(normalizedOrigin, state, effectiveNetworkId)
  }

  if (ETHEREUM_REQUEST_PERMISSIONS_METHODS.has(method)) {
    const approvedOrigin = await requireDappScopes(origin, ['read'])
    if (!network || network.coinType !== 'EVM') {
      throw { code: 4900, message: 'No EVM network is available' }
    }
    const requested = Array.isArray(params) ? params[0] : params
    const requestedCapabilities = requested && typeof requested === 'object' ? Object.keys(requested as Record<string, unknown>) : []
    if (requestedCapabilities.length === 0 || !requestedCapabilities.includes('eth_accounts')) {
      throw { code: 4200, message: 'Unsupported permission request' }
    }
    return buildEvmPermissionResponse(approvedOrigin, await getWalletState(), effectiveNetworkId)
  }

  if (ETHEREUM_REVOKE_PERMISSIONS_METHODS.has(method)) {
    if (!normalizedOrigin) return []
    const requested = Array.isArray(params) ? params[0] : params
    const requestedCapabilities = requested && typeof requested === 'object' ? Object.keys(requested as Record<string, unknown>) : []
    if (requestedCapabilities.length === 0 || !requestedCapabilities.includes('eth_accounts')) {
      return []
    }
    const permissionMap = await getDappPermissionMap()
    if (permissionMap[normalizedOrigin]) {
      delete permissionMap[normalizedOrigin]
      await setDappPermissionMap(permissionMap)
    }
    await updateWalletStateInStorage((current) => ({
      ...current,
      authorizedSites: normalizeAuthorizedSites((current.authorizedSites || []).filter((entry) => normalizeDappOrigin(entry) !== normalizedOrigin))
    }))
    return []
  }

  if (ETHEREUM_ACCOUNTS_METHODS.has(method)) {
    if (!(await canExposeAccountsToOrigin(normalizedOrigin))) {
      return []
    }
    if ((state.isLocked ?? true) || !(state.isInitialized ?? false) || !network || network.coinType !== 'EVM') {
      return []
    }
    return address ? [address] : []
  }

  if (ETHEREUM_REQUEST_ACCOUNTS_METHODS.has(method)) {
    const approvedOrigin = await requireDappScopes(origin, ['read'])
    if (!(state.isInitialized ?? false) || !(state.hasVault ?? false)) {
      throw { code: -32603, message: 'Wallet is not initialized' }
    }
    const refreshed = buildDappRuntimeContext(await getWalletState(), network?.id)
    if (!refreshed.network || refreshed.network.coinType !== 'EVM') {
      throw { code: 4900, message: 'No EVM network is available' }
    }
    await touchLastConnected(approvedOrigin)
    return refreshed.address ? [refreshed.address] : []
  }

  if (ETHEREUM_SWITCH_CHAIN_METHODS.has(method)) {
    const approvedOrigin = await requireDappScopes(origin, ['read', 'switch_network'])
    const payload = Array.isArray(params) ? params[0] : params
    const chainId = parseRequestedChainId((payload as Record<string, unknown> | null)?.chainId)
    if (chainId === null) {
      throw { code: -32602, message: 'wallet_switchEthereumChain requires `chainId`' }
    }
    const nextNetwork = resolveDappNetworks(state).find((entry) => entry.coinType === 'EVM' && entry.chainId === chainId)
    if (!nextNetwork) {
      throw { code: 4902, message: `Unknown EVM chain ${chainId}` }
    }
    await updateWalletStateInStorage((current) => ({
      ...current,
      activeNetworkId: nextNetwork.id
    }))
    await touchLastConnected(approvedOrigin)
    void broadcastEvent('networkChanged', {
      networkId: nextNetwork.id,
      networkLabel: nextNetwork.name,
      coinId: nextNetwork.id,
      coinName: nextNetwork.name,
      coinSymbol: nextNetwork.symbol,
      coinDecimals: resolveCoinDecimals(nextNetwork)
    })
    return null
  }

  if (ETHEREUM_ADD_CHAIN_METHODS.has(method)) {
    const nextNetwork = parseAddEthereumChainPayload(params)
    if (!nextNetwork || !Number.isInteger(nextNetwork.chainId) || Number(nextNetwork.chainId) <= 0) {
      throw { code: -32602, message: 'wallet_addEthereumChain requires `chainId`' }
    }
    if (!String(nextNetwork.rpcUrl || '').trim()) {
      throw { code: -32602, message: 'wallet_addEthereumChain requires at least one RPC URL' }
    }
    await updateWalletStateInStorage((current) => {
      const existing = (current.networks || []).find((entry) => entry.coinType === 'EVM' && entry.chainId === nextNetwork.chainId)
      if (existing) return current
      return {
        ...current,
        networks: [...(current.networks || []), nextNetwork]
      }
    })
    return null
  }

  if (ETHEREUM_WATCH_ASSET_METHODS.has(method)) {
    const approvedOrigin = await requireDappScopes(origin, ['read'])
    if (!network || network.coinType !== 'EVM') {
      throw { code: 4900, message: 'No EVM network is available' }
    }
    const watched = parseWatchAssetPayload(params)
    if (!watched) {
      throw { code: -32602, message: 'wallet_watchAsset requires an ERC20 asset payload' }
    }
    const activeAccount = getActiveAccountFromState(state)
    if (!activeAccount) {
      throw { code: -32603, message: 'No account available' }
    }
    const scopeKey = buildAssetScopeKey(activeAccount.id, network.id)
    await updateWalletStateInStorage((current) => ({
      ...current,
      networkAssets: {
        ...current.networkAssets,
        [network.id]: {
          ...(current.networkAssets?.[network.id] || {}),
          [watched.assetId]: Number(current.networkAssets?.[network.id]?.[watched.assetId] || 0)
        }
      },
      networkAssetLabels: {
        ...current.networkAssetLabels,
        [network.id]: {
          ...(current.networkAssetLabels?.[network.id] || {}),
          [watched.assetId]: watched.label
        }
      },
      networkAssetLogos: {
        ...current.networkAssetLogos,
        [network.id]: {
          ...(current.networkAssetLogos?.[network.id] || {}),
          ...(watched.logo ? { [watched.assetId]: watched.logo } : {})
        }
      },
      accountNetworkAssets: {
        ...current.accountNetworkAssets,
        [scopeKey]: {
          ...(current.accountNetworkAssets?.[scopeKey] || {}),
          [watched.assetId]: Number(current.accountNetworkAssets?.[scopeKey]?.[watched.assetId] || 0)
        }
      },
      accountNetworkAssetLabels: {
        ...current.accountNetworkAssetLabels,
        [scopeKey]: {
          ...(current.accountNetworkAssetLabels?.[scopeKey] || {}),
          [watched.assetId]: watched.label
        }
      },
      accountNetworkAssetLogos: {
        ...current.accountNetworkAssetLogos,
        [scopeKey]: {
          ...(current.accountNetworkAssetLogos?.[scopeKey] || {}),
          ...(watched.logo ? { [watched.assetId]: watched.logo } : {})
        }
      }
    }))
    await touchLastConnected(approvedOrigin)
    return true
  }

  if (isReadOnlyEvmRpcMethod(method)) {
    if (!network || network.coinType !== 'EVM') {
      throw { code: 4900, message: 'No EVM network is available' }
    }
    if (String(method).trim().toLowerCase() === 'net_version') {
      return String(network.chainId ?? '')
    }
    if (String(method).trim().toLowerCase() === 'web3_clientversion') {
      return EVM_CLIENT_VERSION
    }
    const rpcConfig = buildEvmReadRpcConfig(network)
    const rpcParams = Array.isArray(params) ? params : (params === undefined ? [] : [params])
    return await callBridgeMethod(rpcConfig, method, rpcParams)
  }

  if (SIGN_MESSAGE_METHODS.has(method) || ETHEREUM_SIGN_METHODS.has(method)) {
    if (!(state.isInitialized ?? false) || !(state.hasVault ?? false)) {
      throw { code: -32603, message: 'Wallet is not initialized' }
    }
    if (!network) {
      throw { code: 4900, message: 'No network is available' }
    }
    const activeAccount = getActiveAccountFromState(state)
    if (!activeAccount) {
      throw { code: -32603, message: 'No account available' }
    }
    if (isMultisigAccount(activeAccount)) {
      throwUnsupportedMultisigMethod(method)
    }
    const scopes: DappScope[] = ['read', 'sign']
    if (origin) {
      const approved = await requestScopes(origin, scopes, { networkId: effectiveNetworkId, surfaceTarget })
      if (!approved) throw { code: 4001, message: 'User rejected the request' }
      await touchLastConnected(origin)
    }
    const signPayload = parseSignMessageParams(params)
    return await requestDappActionApproval(
      origin || 'unknown',
      network.id,
      activeAccount.id,
      'wallet_signMessage',
      signPayload,
      surfaceTarget
    )
  }

  if (RTM_SIGN_MESSAGE_METHODS.has(method)) {
    if (!(state.isInitialized ?? false) || !(state.hasVault ?? false)) {
      throw { code: -32603, message: 'Wallet is not initialized' }
    }
    if (!network || String(network.id || '').trim() !== 'rtm') {
      throw { code: 4900, message: 'wallet_rtmSignMessage requires the RTM network' }
    }
    const activeAccount = getActiveAccountFromState(state)
    if (!activeAccount) {
      throw { code: -32603, message: 'No account available' }
    }
    if (isMultisigAccount(activeAccount)) {
      throwUnsupportedMultisigMethod(method)
    }
    const scopes: DappScope[] = ['read', 'sign']
    if (origin) {
      const approved = await requestScopes(origin, scopes, { networkId: effectiveNetworkId, surfaceTarget })
      if (!approved) throw { code: 4001, message: 'User rejected the request' }
      await touchLastConnected(origin)
    }
    const signPayload = parseRtmSignMessageParams(params)
    const mnemonic = String((state as any).sessionMnemonic || '').trim()
    if (!mnemonic) {
      throw { code: -32603, message: 'Wallet is locked' }
    }
    const accountIndex = Number.isInteger((activeAccount as any)?.derivationIndex)
      ? Number((activeAccount as any).derivationIndex)
      : Math.max(0, (state.accounts || []).findIndex((entry) => entry.id === activeAccount.id))
    const derived = await deriveUtxoAddress(mnemonic, 'RTM', accountIndex)
    if (signPayload.address && signPayload.address !== derived.address) {
      throw { code: -32602, message: 'wallet_rtmSignMessage address does not match the selected RTM account' }
    }
    return await requestDappActionApproval(
      origin || 'unknown',
      network.id,
      activeAccount.id,
      'wallet_rtmSignMessage',
      {
        ecosystem: 'rtm',
        address: derived.address,
        message: signPayload.message
      },
      surfaceTarget
    )
  }

  if (SIGN_TYPED_DATA_METHODS.has(method) || ETHEREUM_SIGN_TYPED_DATA_METHODS.has(method)) {
    if (!(state.isInitialized ?? false) || !(state.hasVault ?? false)) {
      throw { code: -32603, message: 'Wallet is not initialized' }
    }
    if (!network || network.coinType !== 'EVM') {
      throw { code: 4900, message: 'No EVM network is available' }
    }
    const activeAccount = getActiveAccountFromState(state)
    if (!activeAccount) {
      throw { code: -32603, message: 'No account available' }
    }
    if (isMultisigAccount(activeAccount)) {
      throwUnsupportedMultisigMethod(method)
    }
    if (origin) {
      const approved = await requestScopes(origin, ['read', 'sign'], { networkId: effectiveNetworkId, surfaceTarget })
      if (!approved) throw { code: 4001, message: 'User rejected the request' }
      await touchLastConnected(origin)
    }
    return await requestDappActionApproval(
      origin || 'unknown',
      network.id,
      activeAccount.id,
      'wallet_signTypedData',
      parseSignTypedDataParams(params),
      surfaceTarget
    )
  }

  if (SIGN_TRANSACTION_METHODS.has(method)) {
    if (!(state.isInitialized ?? false) || !(state.hasVault ?? false)) {
      throw { code: -32603, message: 'Wallet is not initialized' }
    }
    if (!network) throw { code: 4900, message: 'No network is available' }
    const activeAccount = getActiveAccountFromState(state)
    if (!activeAccount) throw { code: -32603, message: 'No account available' }
    if (isMultisigAccount(activeAccount)) {
      throwUnsupportedMultisigMethod(method)
    }
    if (origin) {
      const approved = await requestScopes(origin, ['read', 'sign'], { networkId: effectiveNetworkId, surfaceTarget })
      if (!approved) throw { code: 4001, message: 'User rejected the request' }
      await touchLastConnected(origin)
    }
    return await requestDappActionApproval(
      origin || 'unknown',
      network.id,
      activeAccount.id,
      'wallet_signTransaction',
      parseSignTransactionParams(params),
      surfaceTarget
    )
  }

  if (ETHEREUM_SIGN_TRANSACTION_METHODS.has(method)) {
    if (!(state.isInitialized ?? false) || !(state.hasVault ?? false)) {
      throw { code: -32603, message: 'Wallet is not initialized' }
    }
    if (!network || network.coinType !== 'EVM') {
      throw { code: 4900, message: 'No EVM network is available' }
    }
    const activeAccount = getActiveAccountFromState(state)
    if (!activeAccount) throw { code: -32603, message: 'No account available' }
    if (isMultisigAccount(activeAccount)) {
      throwUnsupportedMultisigMethod(method)
    }
    if (origin) {
      const approved = await requestScopes(origin, ['read', 'sign'], { networkId: effectiveNetworkId, surfaceTarget })
      if (!approved) throw { code: 4001, message: 'User rejected the request' }
      await touchLastConnected(origin)
    }
    return await requestDappActionApproval(
      origin || 'unknown',
      network.id,
      activeAccount.id,
      'wallet_signTransaction',
      { ecosystem: 'evm', tx: parseEvmTransactionRequest(params).tx },
      surfaceTarget
    )
  }

  if (SIGN_ALL_TRANSACTIONS_METHODS.has(method)) {
    if (!(state.isInitialized ?? false) || !(state.hasVault ?? false)) {
      throw { code: -32603, message: 'Wallet is not initialized' }
    }
    if (!network) throw { code: 4900, message: 'No network is available' }
    const activeAccount = getActiveAccountFromState(state)
    if (!activeAccount) throw { code: -32603, message: 'No account available' }
    if (isMultisigAccount(activeAccount)) {
      throwUnsupportedMultisigMethod(method)
    }
    if (origin) {
      const approved = await requestScopes(origin, ['read', 'sign'], { networkId: effectiveNetworkId, surfaceTarget })
      if (!approved) throw { code: 4001, message: 'User rejected the request' }
      await touchLastConnected(origin)
    }
    return await requestDappActionApproval(
      origin || 'unknown',
      network.id,
      activeAccount.id,
      'wallet_signAllTransactions',
      parseSignAllTransactionsParams(params),
      surfaceTarget
    )
  }

  if (SIGN_AND_SEND_TRANSACTION_METHODS.has(method)) {
    if (!(state.isInitialized ?? false) || !(state.hasVault ?? false)) {
      throw { code: -32603, message: 'Wallet is not initialized' }
    }
    if (!network) throw { code: 4900, message: 'No network is available' }
    const activeAccount = getActiveAccountFromState(state)
    if (!activeAccount) throw { code: -32603, message: 'No account available' }
    if (isMultisigAccount(activeAccount)) {
      throwUnsupportedMultisigMethod(method)
    }
    if (origin) {
      const approved = await requestScopes(origin, ['read', 'sign', 'send_coin'], { networkId: effectiveNetworkId, surfaceTarget })
      if (!approved) throw { code: 4001, message: 'User rejected the request' }
      await touchLastConnected(origin)
    }
    return await requestDappActionApproval(
      origin || 'unknown',
      network.id,
      activeAccount.id,
      'wallet_signAndSendTransaction',
      parseSignAndSendTransactionParams(params),
      surfaceTarget
    )
  }

  if (COSMOS_GET_KEY_METHODS.has(method)) {
    if (!(state.isInitialized ?? false) || !(state.hasVault ?? false)) {
      throw { code: -32603, message: 'Wallet is not initialized' }
    }
    if (!network) throw { code: 4900, message: 'No network is available' }
    const activeAccount = getActiveAccountFromState(state)
    if (!activeAccount) throw { code: -32603, message: 'No account available' }
    if (isMultisigAccount(activeAccount)) {
      throwUnsupportedMultisigMethod(method)
    }
    if (origin) {
      const approved = await requestScopes(origin, ['read'], { networkId: effectiveNetworkId, surfaceTarget })
      if (!approved) throw { code: 4001, message: 'User rejected the request' }
      await touchLastConnected(origin)
    }
    return await requestDappActionApproval(
      origin || 'unknown',
      network.id,
      activeAccount.id,
      'wallet_cosmosGetKey',
      { chainId: String((params as any)?.chainId || '') },
      surfaceTarget
    )
  }

  if (COSMOS_SIGN_DIRECT_METHODS.has(method)) {
    if (!(state.isInitialized ?? false) || !(state.hasVault ?? false)) {
      throw { code: -32603, message: 'Wallet is not initialized' }
    }
    if (!network) throw { code: 4900, message: 'No network is available' }
    const activeAccount = getActiveAccountFromState(state)
    if (!activeAccount) throw { code: -32603, message: 'No account available' }
    if (isMultisigAccount(activeAccount)) {
      throwUnsupportedMultisigMethod(method)
    }
    if (origin) {
      const approved = await requestScopes(origin, ['read', 'sign'], { networkId: effectiveNetworkId, surfaceTarget })
      if (!approved) throw { code: 4001, message: 'User rejected the request' }
      await touchLastConnected(origin)
    }
    return await requestDappActionApproval(
      origin || 'unknown',
      network.id,
      activeAccount.id,
      'wallet_cosmosSignDirect',
      parseCosmosSignDirectParams(params),
      surfaceTarget
    )
  }

  if (COSMOS_SIGN_AMINO_METHODS.has(method)) {
    if (!(state.isInitialized ?? false) || !(state.hasVault ?? false)) {
      throw { code: -32603, message: 'Wallet is not initialized' }
    }
    if (!network) throw { code: 4900, message: 'No network is available' }
    const activeAccount = getActiveAccountFromState(state)
    if (!activeAccount) throw { code: -32603, message: 'No account available' }
    if (isMultisigAccount(activeAccount)) {
      throwUnsupportedMultisigMethod(method)
    }
    if (origin) {
      const approved = await requestScopes(origin, ['read', 'sign'], { networkId: effectiveNetworkId, surfaceTarget })
      if (!approved) throw { code: 4001, message: 'User rejected the request' }
      await touchLastConnected(origin)
    }
    return await requestDappActionApproval(
      origin || 'unknown',
      network.id,
      activeAccount.id,
      'wallet_cosmosSignAmino',
      parseCosmosSignAminoParams(params),
      surfaceTarget
    )
  }

  if (COSMOS_SEND_TX_METHODS.has(method)) {
    if (!(state.isInitialized ?? false) || !(state.hasVault ?? false)) {
      throw { code: -32603, message: 'Wallet is not initialized' }
    }
    if (!network) throw { code: 4900, message: 'No network is available' }
    const activeAccount = getActiveAccountFromState(state)
    if (!activeAccount) throw { code: -32603, message: 'No account available' }
    if (isMultisigAccount(activeAccount)) {
      throw {
        code: -32603,
        message: 'eth_sendTransaction is not available for multisig accounts in this build'
      }
    }
    if (origin) {
      const approved = await requestScopes(origin, ['read', 'send_coin'], { networkId: effectiveNetworkId, surfaceTarget })
      if (!approved) throw { code: 4001, message: 'User rejected the request' }
      await touchLastConnected(origin)
    }
    return await requestDappActionApproval(
      origin || 'unknown',
      network.id,
      activeAccount.id,
      'wallet_cosmosSendTx',
      parseCosmosSendTxParams(params),
      surfaceTarget
    )
  }

  if (ETHEREUM_SEND_TRANSACTION_METHODS.has(method)) {
    if (!(state.isInitialized ?? false) || !(state.hasVault ?? false)) {
      throw { code: -32603, message: 'Wallet is not initialized' }
    }
    if (!network || network.coinType !== 'EVM') {
      throw { code: 4900, message: 'No EVM network is available' }
    }
    const activeAccount = getActiveAccountFromState(state)
    if (!activeAccount) throw { code: -32603, message: 'No account available' }
    if (origin) {
      const approved = await requestScopes(origin, ['read', 'send_coin'], { networkId: effectiveNetworkId, surfaceTarget })
      if (!approved) throw { code: 4001, message: 'User rejected the request' }
      await touchLastConnected(origin)
    }
    return await requestDappActionApproval(
      origin || 'unknown',
      network.id,
      activeAccount.id,
      'wallet_signAndSendTransaction',
      { ecosystem: 'evm', ...parseEvmTransactionRequest(params) },
      surfaceTarget
    )
  }

  if (SEND_TRANSACTION_METHODS.has(method)) {
    if (!(state.isInitialized ?? false) || !(state.hasVault ?? false)) {
      throw { code: -32603, message: 'Wallet is not initialized' }
    }
    if (!network || !resolveNetworkCapabilities(network).features.nativeSend) {
      throw { code: -32603, message: 'No supported send-capable network selected' }
    }
    const activeAccount = getActiveAccountFromState(state)
    if (!activeAccount) {
      throw { code: -32603, message: 'No account available' }
    }
    if (isMultisigAccount(activeAccount)) {
      throwUnsupportedMultisigMethod(method)
    }

    if (origin) {
      const approved = await requestScopes(origin, ['read', 'send_coin'], { networkId: effectiveNetworkId, surfaceTarget })
      if (!approved) {
        throw { code: 4001, message: 'User rejected the request' }
      }
      await touchLastConnected(origin)
    }

    const parsedSend = parseSendTransactionParams(params, network, resolveCoinDecimals(network))
    const result = await requestDappActionApproval(
      origin || 'unknown',
      network.id,
      activeAccount.id,
      'wallet_sendTransaction',
      parsedSend,
      surfaceTarget
    )
    return result
  }

  if (SEND_ASSET_METHODS.has(method)) {
    if (!(state.isInitialized ?? false) || !(state.hasVault ?? false)) {
      throw { code: -32603, message: 'Wallet is not initialized' }
    }
    if (!network || !resolveNetworkCapabilities(network).features.assetSend) {
      throw { code: -32603, message: 'No supported asset-send network selected' }
    }
    const activeAccount = getActiveAccountFromState(state)
    if (!activeAccount) {
      throw { code: -32603, message: 'No account available' }
    }
    if (isMultisigAccount(activeAccount)) {
      throwUnsupportedMultisigMethod(method)
    }

    if (origin) {
      const approved = await requestScopes(origin, ['read', 'send_asset'], { networkId: effectiveNetworkId, surfaceTarget })
      if (!approved) {
        throw { code: 4001, message: 'User rejected the request' }
      }
      await touchLastConnected(origin)
    }

    const parsedSendAsset = parseSendAssetParams(params)
    const result = await requestDappActionApproval(
      origin || 'unknown',
      network.id,
      activeAccount.id,
      'wallet_sendAsset',
      parsedSendAsset,
      surfaceTarget
    )
    return result
  }

  if (RTM_MARKET_ACTION_METHODS.has(method)) {
    if (!(state.isInitialized ?? false) || !(state.hasVault ?? false)) {
      throw { code: -32603, message: 'Wallet is not initialized' }
    }
    if (!network || String(network.id || '').trim() !== 'rtm') {
      throw { code: -32603, message: 'wallet_rtmMarketAction requires the RTM network' }
    }
    const activeAccount = getActiveAccountFromState(state)
    if (!activeAccount) {
      throw { code: -32603, message: 'No account available' }
    }
    if (isMultisigAccount(activeAccount)) {
      throwUnsupportedMultisigMethod(method)
    }

    const parsedAction = parseRtmMarketActionParams(params)
    const actionKind = String(parsedAction.kind || '').trim()
    const scopes = RTM_ASSET_MARKET_ACTION_KINDS.has(actionKind)
      ? ['read', 'send_asset']
      : ['read', 'send_coin']

    if (origin) {
      const approved = await requestScopes(origin, scopes as any, { networkId: effectiveNetworkId, surfaceTarget })
      if (!approved) {
        throw { code: 4001, message: 'User rejected the request' }
      }
      await touchLastConnected(origin)
    }

    return await requestDappActionApproval(
      origin || 'unknown',
      network.id,
      activeAccount.id,
      'wallet_rtmMarketAction' as any,
      parsedAction,
      surfaceTarget
    )
  }

  if (RTM_ISSUER_ACTION_METHODS.has(method)) {
    if (!(state.isInitialized ?? false) || !(state.hasVault ?? false)) {
      throw { code: -32603, message: 'Wallet is not initialized' }
    }
    if (!network || String(network.id || '').trim() !== 'rtm') {
      throw { code: -32603, message: 'wallet_rtmIssuerAction requires the RTM network' }
    }
    const activeAccount = getActiveAccountFromState(state)
    if (!activeAccount) {
      throw { code: -32603, message: 'No account available' }
    }
    if (isMultisigAccount(activeAccount)) {
      throwUnsupportedMultisigMethod(method)
    }

    const parsedAction = parseRtmIssuerActionParams(params)
    if (origin) {
      const approved = await requestScopes(origin, ['read', 'send_asset'] as any, { networkId: effectiveNetworkId, surfaceTarget })
      if (!approved) {
        throw { code: 4001, message: 'User rejected the request' }
      }
      await touchLastConnected(origin)
    }

    return await requestDappActionApproval(
      origin || 'unknown',
      network.id,
      activeAccount.id,
      'wallet_rtmIssuerAction' as any,
      parsedAction,
      surfaceTarget
    )
  }
  
  // Select account
  if (SELECT_ACCOUNT_METHODS.has(method)) {
    await requireDappScopes(origin, ['read', 'select_account'])

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

    const refreshedState = await getWalletState()
    const address = getActiveAddressFromState(refreshedState, refreshedState.activeNetworkId || DEFAULT_NETWORK_ID)
    void broadcastEvent('accountsChanged', {
      accounts: address ? [address] : [],
      address
    })
    return {
      selectedAddress: address,
      accounts: address ? [address] : []
    }
  }
  
  // Switch network
  if (SWITCH_NETWORK_METHODS.has(method)) {
    await requireDappScopes(origin, ['read', 'switch_network'])

    const { networkId } = params || {}
    if (!networkId) {
      throw { code: -32602, message: 'Network ID is required' }
    }
    
    const currentState = await getWalletState()
    const normalizedNetworkId = String(networkId).trim()
    const normalizedRequestedAlias = normalizedNetworkId.toLowerCase()
    const network = resolveDappNetworks(currentState).find((n) => {
      if (String(n.id || '').trim() === normalizedNetworkId) return true
      return buildNetworkHintAliases(n).lowercase.includes(normalizedRequestedAlias)
    })
    if (!network) {
      throw { code: -32602, message: `Unsupported network for MetaYoshi DApp SDK: ${networkId}` }
    }
    
    // Update active network in storage
    await updateWalletStateInStorage((current) => ({
      ...current,
      activeNetworkId: String(network.id || '').trim() || normalizedNetworkId
    }))
    
    // Broadcast network change event
    void broadcastEvent('networkChanged', {
      networkId: String(network.id || '').trim() || normalizedNetworkId,
      networkLabel: network.name,
      coinId: network.id,
      coinName: network.name,
      coinSymbol: network.symbol,
      coinDecimals: resolveCoinDecimals(network)
    })

    return { networkId: String(network.id || '').trim() || normalizedNetworkId, networkLabel: network.name }
  }
  
  // Unsupported method
  throw { code: -32601, message: `Method not found: ${method}` }
}

async function shouldDeliverEventToOrigin(event: string, origin: string | null): Promise<boolean> {
  if (event === 'accountsChanged' || event === 'lockChanged') {
    return canExposeAccountsToOrigin(origin)
  }
  return true
}

// Broadcast event to connected content scripts, keeping account-bearing events permission-scoped.
async function broadcastEvent(event: string, payload: any): Promise<void> {
  if (eventPorts.size === 0) return
  const message = { type: 'event', event, payload }
  for (const [port, record] of eventPorts.entries()) {
    if (!(await shouldDeliverEventToOrigin(event, record.origin))) continue
    try {
      port.postMessage(message)
    } catch (err) {
      // Port closed, remove it
      eventPorts.delete(port)
    }
  }
}

function handleWalletStorageBroadcast(
  changes: { [key: string]: chrome.storage.StorageChange },
  areaName: string
): void {
  if (eventPorts.size === 0) return
  if (areaName !== 'local' || !changes[WALLET_STORAGE_KEY]) return

  const newValue = changes[WALLET_STORAGE_KEY].newValue
  const oldValue = changes[WALLET_STORAGE_KEY].oldValue
  const newState = unwrapPersistedState<WalletState>(newValue)
  const oldState = unwrapPersistedState<WalletState>(oldValue)

  if (!newState || !oldState) return

  const dappNetworks = resolveDappNetworks(newState)
  const activeDappNetwork = dappNetworks.find((n) => n.id === newState.activeNetworkId) || dappNetworks[0]
  const activeDappNetworkId = activeDappNetwork?.id || DEFAULT_NETWORK_ID

  if (
    newState.activeAccountId !== oldState.activeAccountId ||
    JSON.stringify(newState.accounts) !== JSON.stringify(oldState.accounts)
  ) {
    const address = getActiveAddressFromState(newState, activeDappNetworkId)
    void broadcastEvent('accountsChanged', {
      accounts: address ? [address] : [],
      address
    })
  }

  if (newState.activeNetworkId !== oldState.activeNetworkId) {
    const network = resolveDappNetworks(newState).find((n) => n.id === newState.activeNetworkId)
    if (network && String(network.id || '').trim()) {
      void broadcastEvent('networkChanged', {
        networkId: network.id,
        networkLabel: network.name,
        coinId: network.id,
        coinName: network.name,
        coinSymbol: network.symbol,
        coinDecimals: resolveCoinDecimals(network)
      })
    }
  }

  if (newState.isLocked !== oldState.isLocked) {
    void broadcastEvent('lockChanged', {
      unlocked: !(newState.isLocked ?? true)
    })

    if (newState.isLocked) {
      void broadcastEvent('accountsChanged', {
        accounts: [],
        address: null
      })
    }
  }
}

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message: DappRequest | OpenWalletSurfaceRequest | MonitorRequest, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
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

  if (message?.type === 'METAYOSHI_MONITOR_GET_BRIDGE_TRACE') {
    void getBridgeTraceLog()
      .then((entries) => sendResponse({ ok: true, entries }))
      .catch((err) => {
        sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) })
      })
    return true
  }

  if (message?.type === 'METAYOSHI_MONITOR_CLEAR_BRIDGE_TRACE') {
    void clearBridgeTraceLog()
      .then(() => sendResponse({ ok: true }))
      .catch((err) => {
        sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) })
      })
    return true
  }

  if (message?.type === 'METAYOSHI_OPEN_WALLET_SURFACE') {
    const surfaceTarget: ExtensionSurfaceTarget = {
      ...(typeof sender?.tab?.id === 'number' ? { tabId: sender.tab.id } : {}),
      ...(typeof sender?.tab?.windowId === 'number' ? { windowId: sender.tab.windowId } : {})
    }

    scheduleWalletSurfaceOpen(surfaceTarget)
    sendResponse({ ok: true })
    return true
  }

  if (message.type === 'DAPP_INTERNAL_RPC') {
    const { request, origin } = message
    const originUrl = origin || sender?.origin || sender?.url || 'unknown'
    const surfaceTarget: ExtensionSurfaceTarget = {
      ...(typeof sender?.tab?.id === 'number' ? { tabId: sender.tab.id } : {}),
      ...(typeof sender?.tab?.windowId === 'number' ? { windowId: sender.tab.windowId } : {})
    }
    cancelScheduledWalletSurfaceOpen(surfaceTarget)

    void recordBridgeTrace('background-sw', 'rpc-received', {
      method: request?.method,
      origin: originUrl,
      requestId: request?.id ?? null,
      params: summarizeTraceValue(request?.params),
      senderOrigin: sender?.origin || null,
      senderUrl: sender?.url || null
    })
    
    handleRpcMethod(request.method, request.params, originUrl, surfaceTarget)
      .then((result) => {
        void recordBridgeTrace('background-sw', 'rpc-result', {
          method: request?.method,
          origin: originUrl,
          requestId: request?.id ?? null,
          result: summarizeTraceValue(result)
        })
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
        void recordBridgeTrace('background-sw', 'rpc-error', {
          method: request?.method,
          origin: originUrl,
          requestId: request?.id ?? null,
          code: err?.code ?? null,
          message: err?.message ?? String(err ?? 'Unknown error'),
          data: summarizeTraceValue(err?.data)
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
    const origin = port.sender?.url ? normalizeDappOrigin(port.sender.url) : null
    eventPorts.set(port, { origin })
    
    port.onDisconnect.addListener(() => {
      eventPorts.delete(port)
    })
    
    // Send ready event
    port.postMessage({
      type: 'ready',
      events: ['accountsChanged', 'networkChanged', 'lockChanged']
    })
  }
})

if (!chrome.storage.onChanged.hasListener(handleWalletStorageBroadcast)) {
  chrome.storage.onChanged.addListener(handleWalletStorageBroadcast)
}

chrome.commands?.onCommand.addListener((command) => {
  if (command !== OPEN_WALLET_COMMAND) return

  void openExtensionSurface('/wallet/assets', undefined, {
    fallbackToTabOnSidePanelFailure: false
  }).catch((err) => {
    void recordRuntimeError('background-sw', err, { kind: 'open-wallet-command' })
  })
})

{
  const sidePanel = getSidePanelApi()
  if (sidePanel?.setPanelBehavior) {
    void sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
      void recordRuntimeError('background-sw', err, { kind: 'configure-side-panel-action-click' })
    })
  }
}
