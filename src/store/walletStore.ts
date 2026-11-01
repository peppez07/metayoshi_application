import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import { decryptVaultV1, encryptVaultV1, type EncryptedVaultV1 } from '../lib/vaultCrypto'
import { WALLET_STORAGE_KEY } from '../lib/walletStorage'
import { addressToScript, addressToScriptHash, clearSeedCache, deriveAccountKey, isValidAddress, isValidMnemonic } from '../lib/rtm/address'
import { formatUnits, parseUnits } from '../lib/rtm/amount'
import { buildAssetSend, buildNativeSend, type BuiltTransaction } from '../lib/rtm/builder'
import { describeTx, headerTime } from '../lib/rtm/history'
import { type Transaction } from '../lib/rtm/transaction'
import { needsTipHeight, parseNetworkTx, sendChainFor } from '../lib/coins/families'
import { BUILTIN_ELECTRUM_SERVER, LEGACY_ELECTRUM_SERVER, closeClient, DEFAULT_ELECTRUM_SERVERS, defaultServers, getClient, isValidServerUrl, RtmElectrum, type AssetMetadata } from '../lib/electrum/rtmElectrum'
import { connectionCandidates, crossCheck, fetchPeers, mergePeers, type ChainCheck, type DiscoveredServer } from '../lib/electrum/discovery'
import { DEFAULT_ENABLED_NETWORKS, explorerUrl, isNetworkId, NETWORKS, type NetworkId, type NetworkParams } from '../lib/networks'

export const RTM_DECIMALS = 8
export const RTM_SYMBOL = 'RTM'
export const EXPLORER_URL = String(import.meta.env.VITE_RTM_EXPLORER || 'https://explorer.raptoreum.com').replace(/\/+$/, '')

/** Explorer page for a transaction; null for coins without a known explorer. */
export function explorerTxUrl(network: NetworkId, txid: string): string | null {
  const params = NETWORKS[network]
  return params ? explorerUrl(params, txid) : null
}
const HISTORY_LIMIT = 30
const MAX_ACTIVITY_PREV_TX = 400

export interface Account {
  id: string
  name: string
  derivationIndex: number
  /** Raptoreum address; dApps only ever see this one. */
  address: string
  /** Addresses on the other enabled networks, by network ID (m/44'/coinType'/index'/0/0). */
  addresses: Record<NetworkId, string>
}

export interface ServerConfig {
  servers: string[]
  activeServer: string
}

/** Atomic amounts are kept as decimal strings so the state stays JSON-safe. */
export interface Balance {
  confirmed: string
  unconfirmed: string
}

export interface AssetHolding extends Balance {
  assetId: string
}

export interface AssetInfo {
  assetId: string
  name: string
  decimalPoint: number
  isUnique: boolean
  updatable: boolean
  isRoot: boolean
  supply: string
  mintCount: number
  maxMintCount: number | null
  referenceHash: string
  owner: string
  creationHeight: number | null
}

export interface ActivityItem {
  txid: string
  height: number
  timestamp: number | null
  rtmDelta: string
  assetDeltas: Record<string, string>
  spentFromUs: boolean
}

/** Locally broadcast transactions, shown until the server reports them. */
export interface SentRecord {
  txid: string
  /** Absent on records from RTM-only releases. */
  network?: NetworkId
  accountId: string
  to: string
  amount: string
  assetId?: string
  timestamp: number
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface PreparedSend {
  kind: 'coin' | 'asset'
  network: NetworkId
  /** Native coin symbol; the fee is always paid in it. */
  symbol: string
  accountId: string
  from: string
  to: string
  amount: string
  assetId?: string
  assetName?: string
  fee: string
  hex: string
  txid: string
  size: number
}

export interface FullBackupV2 {
  type: 'metayoshi-full-backup'
  version: 2
  createdAt: number
  vault: EncryptedVaultV1
  accounts: Array<Pick<Account, 'id' | 'name' | 'derivationIndex'>>
  nextAccountIndex: number
  activeAccountId: string | null
  authorizedSites: string[]
  autolockMinutes: number
  backupConfirmed: boolean
  servers: string[]
  /** Added with multi-coin support; older backups restore the defaults. */
  enabledNetworks?: NetworkId[]
  offeredNetworks?: NetworkId[]
  coinServers?: Record<NetworkId, string[]>
}

interface WalletState {
  // persisted
  isInitialized: boolean
  hasVault: boolean
  isLocked: boolean
  vault: EncryptedVaultV1 | null
  backupConfirmed: boolean
  createdAt: number | null
  accounts: Account[]
  nextAccountIndex: number
  activeAccountId: string | null
  authorizedSites: string[]
  autolockMinutes: number
  lastActiveTimestamp: number
  /** The coin the wallet shows and connects for. */
  network: NetworkId
  /** Networks shown in the network picker, in the order they were added. */
  enabledNetworks: NetworkId[]
  /** Default networks this wallet has already been given (see normalizeEnabled). */
  offeredNetworks: NetworkId[]
  /** Raptoreum servers. */
  servers: string[]
  activeServer: string
  /** Servers of every other network. */
  coinServers: Record<NetworkId, ServerConfig>
  /** Servers learned from other servers' smartnode discovery; connection candidates only. */
  discoveredServers: DiscoveredServer[]
  peerDiscovery: boolean
  lastDiscoveryAt: number
  assetInfo: Record<string, AssetInfo>
  sent: SentRecord[]

  // session only
  sessionMnemonic: string | null
  connection: ConnectionStatus
  connectionError: string
  chainCheck: ChainCheck
  serverVersion: string
  assetsReady: boolean
  tipHeight: number
  balances: Record<string, Balance>
  assets: Record<string, AssetHolding[]>
  activity: Record<string, ActivityItem[]>
  refreshing: boolean
  lastRefreshAt: number | null

  initialize: (password: string, mnemonic: string) => Promise<void>
  unlock: (password: string) => Promise<boolean>
  verifyPassword: (password: string) => Promise<boolean>
  lock: () => void
  wipeVault: () => void
  setBackupConfirmed: (confirmed: boolean) => void
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>
  updateLastActive: () => void
  checkAutolock: () => void
  setAutolock: (minutes: number) => void

  addAccount: (name?: string) => Promise<Account>
  removeAccount: (id: string) => void
  renameAccount: (id: string, name: string) => void
  setActiveAccount: (id: string) => void
  setNetwork: (network: NetworkId) => void
  enableNetwork: (network: NetworkId) => Promise<void>
  disableNetwork: (network: NetworkId) => void

  addAuthorizedSite: (origin: string) => void
  removeAuthorizedSite: (origin: string) => void

  addServer: (url: string) => void
  removeServer: (url: string) => void
  setActiveServer: (url: string) => Promise<void>
  setPeerDiscovery: (enabled: boolean) => void
  discoverServers: (force?: boolean) => Promise<void>

  connect: () => Promise<void>
  refresh: () => Promise<void>
  loadAssetInfo: (assetId: string) => Promise<AssetInfo | null>
  /** Native coin send on the selected network; `network` asserts which coin the caller expects. */
  prepareCoinSend: (params: { network: NetworkId; to: string; amount: string; sendMax?: boolean }) => Promise<PreparedSend>
  prepareAssetSend: (params: { assetId: string; to: string; amount: string }) => Promise<PreparedSend>
  broadcast: (prepared: PreparedSend) => Promise<string>

  exportBackup: () => FullBackupV2
  restoreBackup: (params: { backup: unknown; backupPassword: string; newPassword: string }) => Promise<void>
}

// ── helpers ──────────────────────────────────────────────────────────────────

export function activeAccountOf(state: Pick<WalletState, 'accounts' | 'activeAccountId'>): Account | undefined {
  return state.accounts.find((a) => a.id === state.activeAccountId) ?? state.accounts[0]
}

export function formatRtm(atoms: string | bigint): string {
  return formatUnits(BigInt(atoms || 0), RTM_DECIMALS)
}

/** Both coins use 8 decimals. */
export function formatCoin(atoms: string | bigint, network: NetworkId): string {
  return formatUnits(BigInt(atoms || 0), NETWORKS[network].decimals)
}

export function networkParams(state: Pick<WalletState, 'network'>): NetworkParams {
  return NETWORKS[state.network] ?? NETWORKS.rtm
}

export function accountAddress(account: Pick<Account, 'address' | 'addresses'> | undefined, network: NetworkId): string {
  if (!account) return ''
  return network === 'rtm' ? account.address : account.addresses?.[network] ?? ''
}

/** Balances and activity are kept per network and account. */
export function walletKey(network: NetworkId, accountId: string): string {
  return network === 'rtm' ? accountId : `${network}:${accountId}`
}

type ServerFields = Pick<WalletState, 'servers' | 'activeServer' | 'coinServers'>

export function serverStateOf(state: ServerFields, network: NetworkId): ServerConfig {
  if (network === 'rtm') return { servers: state.servers, activeServer: state.activeServer }
  const config = state.coinServers?.[network]
  if (config) return config
  const servers = defaultServers(network)
  return { servers, activeServer: servers[0] ?? '' }
}

function serverPatch(network: NetworkId, servers: string[], activeServer: string, state?: ServerFields): Partial<ServerFields> {
  if (network === 'rtm') return { servers, activeServer }
  return { coinServers: { ...(state?.coinServers ?? {}), [network]: { servers, activeServer } } }
}

function normalizeCoinServers(raw: unknown, legacyBtcz?: { servers?: unknown; activeServer?: unknown }): Record<NetworkId, ServerConfig> {
  const out: Record<NetworkId, ServerConfig> = {}
  const source: Record<string, any> = raw && typeof raw === 'object' ? { ...(raw as Record<string, any>) } : {}
  // State saved by the BitcoinZ-only release.
  if (legacyBtcz?.servers && !source.btcz) source.btcz = { servers: legacyBtcz.servers, activeServer: legacyBtcz.activeServer }
  for (const [id, value] of Object.entries(source)) {
    if (!isNetworkId(id) || id === 'rtm') continue
    const list = Array.isArray(value) ? value : value?.servers
    const servers = normalizeServers(list, id)
    const selected = String(Array.isArray(value) ? '' : value?.activeServer ?? '')
    out[id] = { servers, activeServer: servers.includes(selected) ? selected : servers[0] ?? '' }
  }
  return out
}

/** The default networks of releases that did not record which defaults a wallet was given. */
const FIRST_DEFAULT_NETWORKS: NetworkId[] = ['rtm', 'btcz']

/**
 * Saved networks plus any default the wallet has not been given yet, so a coin
 * added to the defaults appears once in existing wallets and stays removed if
 * the user removes it.
 */
function normalizeEnabled(raw: unknown, offered?: unknown): NetworkId[] {
  const list = Array.isArray(raw) ? raw.filter(isNetworkId) : DEFAULT_ENABLED_NETWORKS
  const given = Array.isArray(offered) ? offered.map(String) : FIRST_DEFAULT_NETWORKS
  const added = DEFAULT_ENABLED_NETWORKS.filter((id) => !given.includes(id))
  return Array.from(new Set(['rtm', ...list, ...added]))
}

export function formatAsset(atoms: string | bigint, info?: Pick<AssetInfo, 'decimalPoint'>): string {
  // Asset quantities are always 8-decimal fixed point on chain; decimal_point
  // only restricts how many of those digits are meaningful.
  const text = formatUnits(BigInt(atoms || 0), 8)
  if (!info) return text
  const [whole, fraction = ''] = text.split('.')
  const trimmed = fraction.slice(0, info.decimalPoint).replace(/0+$/, '')
  return trimmed ? `${whole}.${trimmed}` : whole
}

/** Converts a user quantity to on-chain 8-decimal atoms, enforcing decimal_point. */
export function parseAssetQuantity(amount: string, info: Pick<AssetInfo, 'decimalPoint' | 'isUnique'>): bigint {
  const decimals = info.isUnique ? 0 : Math.min(8, Math.max(0, info.decimalPoint))
  return parseUnits(amount, decimals, 'Quantity') * 10n ** BigInt(8 - decimals)
}

export function assetLabel(assetId: string, info?: AssetInfo): string {
  return info?.name || `${assetId.slice(0, 8)}…${assetId.slice(-6)}`
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function newAccountId(): string {
  return `acc-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`
}

function normalizeServers(list: unknown, network: NetworkId = 'rtm'): string[] {
  const migrate = network === 'rtm' ? migrateServer : (url: string) => url
  const values = Array.isArray(list) ? list.map((s) => migrate(String(s || '').trim())).filter(isValidServerUrl) : []
  const unique = Array.from(new Set(values))
  // An emptied list stays empty for coins without default servers.
  return unique.length > 0 || (Array.isArray(list) && network !== 'rtm') ? unique : defaultServers(network)
}

function migrateServer(url: string): string {
  return url === LEGACY_ELECTRUM_SERVER ? BUILTIN_ELECTRUM_SERVER : url
}

function toAssetInfo(m: AssetMetadata): AssetInfo {
  return { ...m, supply: m.supply.toString() }
}

/** Accepts accounts from 0.1.x (multichain shape) and from this version. */
function migrateAccounts(raw: unknown): Account[] {
  if (!Array.isArray(raw)) return []
  const accounts: Account[] = []
  raw.forEach((item: any, index) => {
    if (!item || typeof item !== 'object') return
    const derivationIndex = Number.isInteger(item.derivationIndex) && item.derivationIndex >= 0 ? item.derivationIndex : index
    const legacyName = item.networkNames?.rtm
    const address = String(item.address ?? item.networkAddresses?.rtm ?? '').trim()
    const saved: Record<string, unknown> = item.addresses && typeof item.addresses === 'object' ? { ...item.addresses } : {}
    if (item.btczAddress && !saved.btcz) saved.btcz = item.btczAddress
    const addresses: Record<NetworkId, string> = {}
    for (const [id, value] of Object.entries(saved)) {
      const text = String(value ?? '').trim()
      if (isNetworkId(id) && id !== 'rtm' && isValidAddress(text, NETWORKS[id])) addresses[id] = text
    }
    accounts.push({
      id: String(item.id || `acc-${derivationIndex + 1}`),
      name: String(legacyName || item.name || `Account ${derivationIndex + 1}`).trim(),
      derivationIndex,
      address: isValidAddress(address) ? address : '',
      addresses
    })
  })
  return accounts
}

/** The RTM address plus one address per enabled network. */
async function deriveAddresses(mnemonic: string, derivationIndex: number, networks: NetworkId[]): Promise<Pick<Account, 'address' | 'addresses'>> {
  const rtm = await deriveAccountKey(mnemonic, derivationIndex)
  const addresses: Record<NetworkId, string> = {}
  for (const id of networks) {
    if (id === 'rtm' || !isNetworkId(id)) continue
    addresses[id] = (await deriveAccountKey(mnemonic, derivationIndex, NETWORKS[id])).address
  }
  return { address: rtm.address, addresses }
}

async function deriveAccounts(mnemonic: string, accounts: Account[], networks: NetworkId[]): Promise<Account[]> {
  return Promise.all(accounts.map(async (a) => ({ ...a, ...(await deriveAddresses(mnemonic, a.derivationIndex, networks)) })))
}

function newAccount(id: string, name: string, derivationIndex: number): Account {
  return { id, name, derivationIndex, address: '', addresses: {} }
}

/** Real block times only; a misread header yields no time instead of a wrong one. */
function plausibleTime(ms: number): number | null {
  return ms > Date.UTC(2009, 0, 1) && ms < Date.now() + 2 * 3600_000 ? ms : null
}

// ── storage (chrome.storage.local, shared with the background worker) ────────

function hasChromeStorage(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local)
}

const extensionStorage: StateStorage = {
  getItem: async (name) => {
    if (!hasChromeStorage()) return localStorage.getItem(name)
    const raw = (await chrome.storage.local.get(name))[name]
    if (raw === undefined) return null
    if (typeof raw === 'string') return raw
    if (raw && typeof raw === 'object' && 'state' in raw) return JSON.stringify(raw)
    return JSON.stringify({ state: raw, version: 0 })
  },
  setItem: async (name, value) => {
    if (!hasChromeStorage()) return localStorage.setItem(name, value)
    await chrome.storage.local.set({ [name]: JSON.parse(value) })
  },
  removeItem: async (name) => {
    if (!hasChromeStorage()) return localStorage.removeItem(name)
    await chrome.storage.local.remove(name)
  }
}

// ── Electrum session ─────────────────────────────────────────────────────────

let api: RtmElectrum | null = null
let unsubscribers: Array<() => void> = []
let refreshTimer: ReturnType<typeof setTimeout> | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
/** Incremented by every connect(); a connect loop that is no longer current stops. */
let connectRun = 0
const txCache = new Map<string, Transaction>()
const headerTimeCache = new Map<string, number>()

/** `height` comes from the address history; it lets servers without Core txindex answer. */
async function fetchTx(server: RtmElectrum, txid: string, height: number): Promise<Transaction> {
  const key = `${server.network.id}:${txid}`
  const cached = txCache.get(key)
  if (cached) return cached
  const hex = await server.getTransactionAt(txid, height)
  const tx = parseNetworkTx(server.network, hex)
  if (txCache.size > MAX_ACTIVITY_PREV_TX) txCache.delete(txCache.keys().next().value as string)
  txCache.set(key, tx)
  return tx
}

async function blockTime(server: RtmElectrum, height: number): Promise<number | null> {
  if (height <= 0) return null
  const key = `${server.network.id}:${height}`
  const cached = headerTimeCache.get(key)
  if (cached) return cached
  const time = plausibleTime(headerTime(await server.blockHeader(height), server.network.headerTimeOffset))
  if (time === null) return null
  headerTimeCache.set(key, time)
  return time
}

function teardownSession(): void {
  for (const off of unsubscribers) off()
  unsubscribers = []
  if (refreshTimer) clearTimeout(refreshTimer)
  refreshTimer = null
  if (reconnectTimer) clearTimeout(reconnectTimer)
  reconnectTimer = null
  api = null
  closeClient()
}

function requireApi(): RtmElectrum {
  if (!api) throw new Error('Not connected to an ElectrumX server')
  return api
}

const DISCOVERY_INTERVAL_MS = 30 * 60_000

/** Signing is refused while the connected server disagrees with every other reachable server. */
function requireTrustedApi(chainCheck: ChainCheck): RtmElectrum {
  if (chainCheck === 'mismatch') {
    throw new Error('This server reports a different chain than other servers. Switch servers in Settings before sending.')
  }
  return requireApi()
}

// ── store ────────────────────────────────────────────────────────────────────

const SESSION_DEFAULTS = {
  sessionMnemonic: null,
  connection: 'disconnected' as ConnectionStatus,
  connectionError: '',
  chainCheck: 'idle' as ChainCheck,
  serverVersion: '',
  assetsReady: false,
  tipHeight: 0,
  balances: {},
  assets: {},
  activity: {},
  refreshing: false,
  lastRefreshAt: null
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => {
      const scheduleRefresh = (delayMs = 500): void => {
        if (refreshTimer) clearTimeout(refreshTimer)
        refreshTimer = setTimeout(() => {
          refreshTimer = null
          void get().refresh()
        }, delayMs)
      }

      // Backs off 5s, 10s, 20s … up to 2 minutes while the wallet is unlocked.
      const scheduleReconnect = (): void => {
        if (reconnectTimer || get().isLocked) return
        const delay = Math.min(120_000, 5000 * 2 ** reconnectAttempts)
        reconnectAttempts += 1
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null
          if (!get().isLocked && get().connection === 'error') void get().connect()
        }, delay)
      }

      // Finds more servers, then confirms the connected server's chain with another one.
      const verifyChain = async (server: RtmElectrum, tip: number): Promise<void> => {
        const network = server.network
        if (network.peerDiscovery) {
          if (!get().peerDiscovery) return
          await get().discoverServers().catch(() => undefined)
        }
        if (api !== server) return
        const { activeServer, servers } = serverStateOf(get(), network.id)
        const discovered = network.peerDiscovery ? get().discoveredServers : []
        const others = connectionCandidates('', servers, discovered).filter((url) => url !== activeServer)
        if (others.length === 0) {
          set({ chainCheck: 'unverified' })
          return
        }
        set({ chainCheck: 'checking' })
        const result = await crossCheck(server, tip, others).catch(() => 'unverified' as const)
        if (api === server) set({ chainCheck: result })
      }

      const signingKey = async (accountId: string, network: NetworkParams = NETWORKS.rtm) => {
        const { sessionMnemonic, accounts, isLocked } = get()
        if (isLocked || !sessionMnemonic) throw new Error('Wallet is locked')
        const account = accounts.find((a) => a.id === accountId)
        if (!account) throw new Error('Account not found')
        const key = await deriveAccountKey(sessionMnemonic, account.derivationIndex, network)
        const expected = accountAddress(account, network.id)
        if (expected && key.address !== expected) throw new Error('Derived key does not match the account address')
        return { account, key }
      }

      const subscribeActive = async (): Promise<void> => {
        const server = api
        const address = accountAddress(activeAccountOf(get()), get().network)
        if (!server || !address) return
        await server.subscribeAddress(address).catch(() => null)
        if (get().assetsReady && server.network.hasAssets) await server.subscribeAssets(address).catch(() => null)
      }

      return {
        isInitialized: false,
        hasVault: false,
        isLocked: true,
        vault: null,
        backupConfirmed: false,
        createdAt: null,
        accounts: [],
        nextAccountIndex: 1,
        activeAccountId: null,
        authorizedSites: [],
        autolockMinutes: 5,
        lastActiveTimestamp: Date.now(),
        network: 'rtm',
        enabledNetworks: [...DEFAULT_ENABLED_NETWORKS],
        offeredNetworks: [...DEFAULT_ENABLED_NETWORKS],
        servers: [...DEFAULT_ELECTRUM_SERVERS],
        activeServer: DEFAULT_ELECTRUM_SERVERS[0],
        coinServers: {},
        discoveredServers: [],
        peerDiscovery: true,
        lastDiscoveryAt: 0,
        assetInfo: {},
        sent: [],
        ...SESSION_DEFAULTS,

        initialize: async (password, mnemonic) => {
          const phrase = mnemonic.trim().toLowerCase().split(/\s+/).join(' ')
          if (!isValidMnemonic(phrase)) throw new Error('Invalid recovery phrase')
          const vault = await encryptVaultV1({ password, mnemonic: phrase })
          const first = await deriveAddresses(phrase, 0, get().enabledNetworks)
          set({
            isInitialized: true,
            hasVault: true,
            isLocked: false,
            vault,
            backupConfirmed: false,
            createdAt: Date.now(),
            sessionMnemonic: phrase,
            accounts: [{ ...newAccount('acc-1', 'Account 1', 0), ...first }],
            nextAccountIndex: 1,
            activeAccountId: 'acc-1',
            lastActiveTimestamp: Date.now(),
            sent: [],
            balances: {},
            assets: {},
            activity: {}
          })
        },

        unlock: async (password) => {
          const { vault } = get()
          if (!vault) return false
          let mnemonic: string
          let createdAt: number
          try {
            const plain = await decryptVaultV1({ password, vault })
            mnemonic = plain.mnemonic.trim()
            createdAt = plain.createdAt
          } catch {
            return false
          }
          const existing = get().accounts.length > 0
            ? get().accounts
            : [newAccount('acc-1', 'Account 1', 0)]
          const accounts = await deriveAccounts(mnemonic, existing, get().enabledNetworks)
          const highest = accounts.reduce((max, a) => Math.max(max, a.derivationIndex), -1)
          set((state) => ({
            isLocked: false,
            hasVault: true,
            isInitialized: true,
            sessionMnemonic: mnemonic,
            createdAt: state.createdAt ?? createdAt ?? Date.now(),
            accounts,
            nextAccountIndex: Math.max(state.nextAccountIndex, highest + 1),
            activeAccountId: accounts.some((a) => a.id === state.activeAccountId) ? state.activeAccountId : accounts[0].id,
            lastActiveTimestamp: Date.now()
          }))
          return true
        },

        verifyPassword: async (password) => {
          const { vault } = get()
          if (!vault) return false
          try {
            await decryptVaultV1({ password, vault })
            return true
          } catch {
            return false
          }
        },

        lock: () => {
          clearSeedCache()
          set({ isLocked: true, sessionMnemonic: null })
        },

        wipeVault: () => {
          teardownSession()
          clearSeedCache()
          txCache.clear()
          set({
            isInitialized: false,
            hasVault: false,
            isLocked: true,
            vault: null,
            backupConfirmed: false,
            createdAt: null,
            accounts: [],
            nextAccountIndex: 1,
            activeAccountId: null,
            authorizedSites: [],
            network: 'rtm',
            assetInfo: {},
            sent: [],
            ...SESSION_DEFAULTS
          })
        },

        setBackupConfirmed: (confirmed) => set({ backupConfirmed: confirmed }),

        changePassword: async (oldPassword, newPassword) => {
          const { vault } = get()
          if (!vault) throw new Error('No vault found')
          let mnemonic: string
          try {
            mnemonic = (await decryptVaultV1({ password: oldPassword, vault })).mnemonic
          } catch {
            throw new Error('Current password is incorrect')
          }
          set({ vault: await encryptVaultV1({ password: newPassword, mnemonic }) })
        },

        updateLastActive: () => set({ lastActiveTimestamp: Date.now() }),

        checkAutolock: () => {
          const { lastActiveTimestamp, autolockMinutes, isLocked, isInitialized } = get()
          if (!isInitialized || isLocked || autolockMinutes <= 0) return
          if (Date.now() - lastActiveTimestamp > autolockMinutes * 60_000) get().lock()
        },

        setAutolock: (minutes) => set({ autolockMinutes: minutes }),

        addAccount: async (name) => {
          const { sessionMnemonic, isLocked, nextAccountIndex, accounts } = get()
          if (isLocked || !sessionMnemonic) throw new Error('Unlock the wallet to add an account')
          const derivationIndex = Math.max(nextAccountIndex, accounts.reduce((m, a) => Math.max(m, a.derivationIndex + 1), 0))
          const account: Account = {
            ...newAccount(newAccountId(), String(name || '').trim() || `Account ${derivationIndex + 1}`, derivationIndex),
            ...(await deriveAddresses(sessionMnemonic, derivationIndex, get().enabledNetworks))
          }
          set((state) => ({ accounts: [...state.accounts, account], nextAccountIndex: derivationIndex + 1 }))
          return account
        },

        removeAccount: (id) => set((state) => {
          if (state.accounts.length <= 1) return {}
          const accounts = state.accounts.filter((a) => a.id !== id)
          return { accounts, activeAccountId: state.activeAccountId === id ? accounts[0].id : state.activeAccountId }
        }),

        renameAccount: (id, name) => set((state) => ({
          accounts: state.accounts.map((a) => (a.id === id ? { ...a, name: name.trim() || a.name } : a))
        })),

        setActiveAccount: (id) => {
          if (!get().accounts.some((a) => a.id === id)) return
          set({ activeAccountId: id })
          void subscribeActive().then(() => get().refresh())
        },

        setNetwork: (network) => {
          if (!isNetworkId(network) || network === get().network || !get().enabledNetworks.includes(network)) return
          teardownSession()
          set({ network, connection: 'disconnected', connectionError: '', chainCheck: 'idle', serverVersion: '', assetsReady: false, tipHeight: 0 })
          if (!get().isLocked) void get().connect()
        },

        enableNetwork: async (network) => {
          if (!isNetworkId(network) || get().enabledNetworks.includes(network)) return
          const { sessionMnemonic, isLocked } = get()
          if (isLocked || !sessionMnemonic) throw new Error('Unlock the wallet to add a network')
          const params = NETWORKS[network]
          const accounts = await Promise.all(get().accounts.map(async (a) => ({
            ...a,
            addresses: { ...a.addresses, [network]: (await deriveAccountKey(sessionMnemonic, a.derivationIndex, params)).address }
          })))
          set((state) => ({ accounts, enabledNetworks: [...state.enabledNetworks, network] }))
        },

        disableNetwork: (network) => {
          if (network === 'rtm') return
          if (get().network === network) get().setNetwork('rtm')
          set((state) => ({ enabledNetworks: state.enabledNetworks.filter((id) => id !== network) }))
        },

        addAuthorizedSite: (origin) => set((state) => ({
          authorizedSites: state.authorizedSites.includes(origin) ? state.authorizedSites : [...state.authorizedSites, origin]
        })),

        removeAuthorizedSite: (origin) => set((state) => ({
          authorizedSites: state.authorizedSites.filter((site) => site !== origin)
        })),

        addServer: (url) => {
          const value = url.trim()
          if (!isValidServerUrl(value)) throw new Error('Use an HTTPS or WebSocket URL without credentials or fragments')
          set((state) => {
            const { servers, activeServer } = serverStateOf(state, state.network)
            return serverPatch(state.network, servers.includes(value) ? servers : [...servers, value], activeServer || value, state)
          })
        },

        removeServer: (url) => set((state) => {
          const current = serverStateOf(state, state.network)
          const servers = current.servers.filter((s) => s !== url)
          const next = servers.length > 0 || state.network !== 'rtm' ? servers : defaultServers(state.network)
          return serverPatch(state.network, next, next.includes(current.activeServer) ? current.activeServer : next[0] ?? '', state)
        }),

        setActiveServer: async (url) => {
          const { network } = get()
          const discovered = NETWORKS[network].peerDiscovery && get().discoveredServers.some((p) => p.url === url)
          if (!serverStateOf(get(), network).servers.includes(url) && !discovered) get().addServer(url)
          set((state) => serverPatch(network, serverStateOf(state, network).servers, url, state))
          teardownSession()
          set({ connection: 'disconnected' })
          await get().connect()
        },

        setPeerDiscovery: (enabled) => {
          set({ peerDiscovery: enabled, ...(enabled ? {} : { chainCheck: 'idle' as ChainCheck }) })
          if (enabled) void get().discoverServers(true)
        },

        discoverServers: async (force = false) => {
          const { peerDiscovery, lastDiscoveryAt, activeServer, servers, connection, network } = get()
          if (!peerDiscovery || connection !== 'connected' || !NETWORKS[network].peerDiscovery) return
          const now = Date.now()
          if (!force && now - lastDiscoveryAt < DISCOVERY_INTERVAL_MS) return
          set({ lastDiscoveryAt: now })
          // Ask the connected server first; other configured gateways add independent views.
          const sources = Array.from(new Set([activeServer, ...servers])).slice(0, 3)
          const lists = await Promise.all(sources.map((url) => fetchPeers(url)))
          set((state) => ({ discoveredServers: mergePeers(state.discoveredServers, lists.flat(), Date.now()) }))
        },

        connect: async () => {
          if (api && get().connection === 'connected') return
          if (get().connection === 'connecting') return
          const run = ++connectRun
          const current = () => run === connectRun
          const network = networkParams(get())
          set({ connection: 'connecting', connectionError: '', chainCheck: 'idle' })
          const { activeServer, servers } = serverStateOf(get(), network.id)
          const discovered = get().peerDiscovery && network.peerDiscovery ? get().discoveredServers : []
          const candidates = connectionCandidates(activeServer, servers, discovered)
          const errors: string[] = []
          for (const url of candidates) {
            if (!current()) return
            teardownSession()
            const client = getClient(url)
            const candidate = new RtmElectrum(client, network)
            try {
              const features = await candidate.verifyNetwork()
              if (!current()) return
              api = candidate
              const tip = await candidate.tipHeight()
              if (!current()) return
              unsubscribers.push(
                candidate.onHeader((height) => {
                  set({ tipHeight: height })
                  scheduleRefresh(1500)
                }),
                candidate.onAddressChange(() => scheduleRefresh()),
                candidate.onAssetChange(() => scheduleRefresh()),
                client.onStateChange((state) => {
                  if (state === 'closed' && api === candidate) {
                    api = null
                    set({ connection: 'error', connectionError: 'Connection to server lost' })
                    scheduleReconnect()
                  }
                })
              )
              reconnectAttempts = 0
              set((state) => ({
                ...serverPatch(network.id, serverStateOf(state, network.id).servers, url, state),
                connection: 'connected',
                connectionError: '',
                serverVersion: features.serverVersion,
                assetsReady: features.assetsReady,
                tipHeight: tip
              }))
              await subscribeActive()
              await get().refresh()
              void verifyChain(candidate, tip)
              return
            } catch (error) {
              if (!current()) return
              errors.push(`${url}: ${errorMessage(error)}`)
            }
          }
          if (!current()) return
          teardownSession()
          set({ connection: 'error', connectionError: errors.join('\n') || `No ${network.name} ElectrumX server configured. Add one in Settings → ElectrumX servers.` })
          scheduleReconnect()
        },

        refresh: async () => {
          const account = activeAccountOf(get())
          const server = api
          if (!server || !account || get().refreshing) return
          const network = server.network
          const address = accountAddress(account, network.id)
          if (!address) return
          const key = walletKey(network.id, account.id)
          set({ refreshing: true })
          try {
            const [balance, history] = await Promise.all([server.balance(address), server.history(address)])
            const holdings = get().assetsReady && network.hasAssets ? await server.assetBalances(address) : []
            set((state) => ({
              balances: { ...state.balances, [key]: { confirmed: balance.confirmed.toString(), unconfirmed: balance.unconfirmed.toString() } },
              ...(network.hasAssets ? {
                assets: {
                  ...state.assets,
                  [account.id]: holdings
                    .filter((h) => h.confirmed + h.unconfirmed > 0n)
                    .map((h) => ({ assetId: h.assetId, confirmed: h.confirmed.toString(), unconfirmed: h.unconfirmed.toString() }))
                }
              } : {})
            }))
            for (const h of holdings) if (!get().assetInfo[h.assetId]) void get().loadAssetInfo(h.assetId)

            const ownScript = addressToScript(address, network)
            const recent = [...history]
              .sort((a, b) => (a.height <= 0 ? Number.MAX_SAFE_INTEGER : a.height) - (b.height <= 0 ? Number.MAX_SAFE_INTEGER : b.height))
              .slice(-HISTORY_LIMIT)
              .reverse()
            const previous = new Map((get().activity[key] ?? []).map((item) => [item.txid, item]))
            // An input can only spend our output if its funding tx is in our history.
            const heights = new Map(history.map((h) => [h.txid, h.height]))
            const fetchOwnPrev = async (txid: string) => {
              const height = heights.get(txid)
              return height === undefined ? null : fetchTx(server, txid, height)
            }
            const items: ActivityItem[] = []
            for (const entry of recent) {
              const known = previous.get(entry.txid)
              if (known && known.height === entry.height && (entry.height <= 0 || known.timestamp)) {
                items.push(known)
                continue
              }
              try {
                const effect = await describeTx(await fetchTx(server, entry.txid, entry.height), ownScript, fetchOwnPrev)
                items.push({
                  txid: entry.txid,
                  height: entry.height,
                  timestamp: await blockTime(server, entry.height).catch(() => null),
                  rtmDelta: effect.rtmDelta.toString(),
                  assetDeltas: Object.fromEntries(Object.entries(effect.assetDeltas).map(([k, v]) => [k, v.toString()])),
                  spentFromUs: effect.spentFromUs
                })
              } catch {
                items.push({ txid: entry.txid, height: entry.height, timestamp: null, rtmDelta: '0', assetDeltas: {}, spentFromUs: false })
              }
            }
            const seen = new Set(history.map((h) => h.txid))
            set((state) => ({
              activity: { ...state.activity, [key]: items },
              sent: state.sent.filter((s) => !(seen.has(s.txid) && (s.network ?? 'rtm') === network.id) && Date.now() - s.timestamp < 3 * 3600_000),
              lastRefreshAt: Date.now()
            }))
          } catch (error) {
            if (api === server) set({ connectionError: errorMessage(error) })
          } finally {
            set({ refreshing: false })
            // The network or server changed while this refresh ran; load the new one.
            if (api && api !== server) scheduleRefresh()
          }
        },

        loadAssetInfo: async (assetId) => {
          const cached = get().assetInfo[assetId]
          if (cached) return cached
          if (!api || !api.network.hasAssets) return null
          const metadata = await api.assetMetadata(assetId).catch(() => null)
          if (!metadata) return null
          const info = toAssetInfo(metadata)
          set((state) => ({ assetInfo: { ...state.assetInfo, [assetId]: info } }))
          return info
        },

        prepareCoinSend: async ({ network: expected, to, amount, sendMax }) => {
          const network = networkParams(get())
          if (expected !== network.id) throw new Error(`Switch MetaYoshi to ${NETWORKS[expected]?.name ?? expected} to send this transaction`)
          const server = requireTrustedApi(get().chainCheck)
          if (server.network.id !== network.id) throw new Error('Not connected to this network yet')
          const account = activeAccountOf(get())
          if (!account) throw new Error('No account')
          const recipient = to.trim()
          if (!isValidAddress(recipient, network)) throw new Error(`Enter a valid ${network.name} address`)
          const value = sendMax ? 0n : parseUnits(amount, network.decimals)
          if (!sendMax && value <= 0n) throw new Error('Amount must be greater than zero')
          const { key } = await signingKey(account.id, network)
          const from = key.address
          const [coins, rates, tip] = await Promise.all([
            server.listUnspent(from),
            server.feeRates(),
            needsTipHeight(network) ? server.tipHeight() : Promise.resolve(0)
          ])
          const built: BuiltTransaction = buildNativeSend({
            senderAddress: from,
            privateKey: key.privateKey,
            coins,
            outputs: [{ address: recipient, value }],
            feePerByte: rates.feePerByte,
            sendMax,
            chain: sendChainFor(network, { tipHeight: tip, relayFeePerByte: rates.relayFeePerByte })
          })
          return {
            kind: 'coin',
            network: network.id,
            symbol: network.symbol,
            accountId: account.id,
            from,
            to: recipient,
            amount: formatCoin(built.sent, network.id),
            fee: formatCoin(built.fee, network.id),
            hex: built.hex,
            txid: built.txid,
            size: built.size
          }
        },

        prepareAssetSend: async ({ assetId, to, amount }) => {
          if (!networkParams(get()).hasAssets) throw new Error('Switch MetaYoshi to Raptoreum to send assets')
          const server = requireTrustedApi(get().chainCheck)
          if (!server.network.hasAssets) throw new Error('Not connected to Raptoreum yet')
          if (!get().assetsReady) throw new Error('The server asset index is still synchronizing')
          const account = activeAccountOf(get())
          if (!account) throw new Error('No account')
          const recipient = to.trim()
          if (!isValidAddress(recipient)) throw new Error('Enter a valid Raptoreum address')
          const info = await get().loadAssetInfo(assetId)
          if (!info) throw new Error('Asset metadata is unavailable')
          const qty = parseAssetQuantity(amount, info)
          const { key } = await signingKey(account.id)
          const [assetUtxos, coins, feePerByte] = await Promise.all([
            server.assetUnspent(account.address, assetId),
            server.listUnspent(account.address),
            server.feePerByte()
          ])
          const built = buildAssetSend({
            senderAddress: account.address,
            privateKey: key.privateKey,
            toAddress: recipient,
            assetId,
            isUnique: info.isUnique,
            amount: qty,
            assetUtxos,
            coins,
            feePerByte
          })
          return {
            kind: 'asset',
            network: 'rtm',
            symbol: RTM_SYMBOL,
            accountId: account.id,
            from: account.address,
            to: recipient,
            amount: formatAsset(qty, info),
            assetId,
            assetName: info.name,
            fee: formatRtm(built.fee),
            hex: built.hex,
            txid: built.txid,
            size: built.size
          }
        },

        broadcast: async (prepared) => {
          const server = requireTrustedApi(get().chainCheck)
          if (prepared.network !== get().network || server.network.id !== prepared.network) {
            throw new Error(`This transaction is for ${NETWORKS[prepared.network]?.name ?? prepared.network}; switch back to that network to send it`)
          }
          const txid = await server.broadcast(prepared.hex)
          if (txid !== prepared.txid) throw new Error(`Server returned unexpected txid ${txid}`)
          set((state) => ({
            sent: [
              { txid, network: prepared.network, accountId: prepared.accountId, to: prepared.to, amount: prepared.amount, assetId: prepared.assetId, timestamp: Date.now() },
              ...state.sent
            ]
          }))
          scheduleRefresh(1000)
          return txid
        },

        exportBackup: () => {
          const state = get()
          if (!state.vault) throw new Error('No vault found')
          return {
            type: 'metayoshi-full-backup',
            version: 2,
            createdAt: state.createdAt ?? Date.now(),
            vault: state.vault,
            accounts: state.accounts.map(({ id, name, derivationIndex }) => ({ id, name, derivationIndex })),
            nextAccountIndex: state.nextAccountIndex,
            activeAccountId: state.activeAccountId,
            authorizedSites: state.authorizedSites,
            autolockMinutes: state.autolockMinutes,
            backupConfirmed: state.backupConfirmed,
            servers: state.servers,
            enabledNetworks: state.enabledNetworks,
            offeredNetworks: state.offeredNetworks,
            coinServers: Object.fromEntries(Object.entries(state.coinServers).map(([id, config]) => [id, config.servers]))
          }
        },

        restoreBackup: async ({ backup, backupPassword, newPassword }) => {
          const data = backup as any
          if (data?.type !== 'metayoshi-full-backup' || !data.vault) throw new Error('Not a MetaYoshi full backup file')
          let plain
          try {
            plain = await decryptVaultV1({ password: backupPassword, vault: data.vault })
          } catch {
            throw new Error('Backup password is incorrect')
          }
          const mnemonic = plain.mnemonic.trim()
          const vault = await encryptVaultV1({ password: newPassword, mnemonic })
          const migrated = migrateAccounts(data.accounts)
          const enabledNetworks = normalizeEnabled(data.enabledNetworks, data.offeredNetworks)
          const accounts = await deriveAccounts(mnemonic, migrated.length > 0 ? migrated : [newAccount('acc-1', 'Account 1', 0)], enabledNetworks)
          const highest = accounts.reduce((max, a) => Math.max(max, a.derivationIndex), -1)
          teardownSession()
          set({
            isInitialized: true,
            hasVault: true,
            isLocked: false,
            vault,
            createdAt: Number(data.createdAt) || Date.now(),
            backupConfirmed: Boolean(data.backupConfirmed),
            sessionMnemonic: mnemonic,
            accounts,
            nextAccountIndex: Math.max(Number(data.nextAccountIndex) || 0, highest + 1),
            activeAccountId: accounts.some((a) => a.id === data.activeAccountId) ? data.activeAccountId : accounts[0].id,
            authorizedSites: Array.isArray(data.authorizedSites) ? data.authorizedSites.map(String) : [],
            autolockMinutes: Number(data.autolockMinutes) || 5,
            servers: normalizeServers(data.servers),
            enabledNetworks,
            offeredNetworks: [...DEFAULT_ENABLED_NETWORKS],
            coinServers: normalizeCoinServers(data.coinServers, { servers: data.btczServers }),
            network: 'rtm',
            lastActiveTimestamp: Date.now(),
            sent: [],
            balances: {},
            assets: {},
            activity: {},
            connection: 'disconnected'
          })
        }
      }
    },
    {
      name: WALLET_STORAGE_KEY,
      version: 2,
      storage: createJSONStorage(() => extensionStorage),
      partialize: (state) => ({
        isInitialized: state.isInitialized,
        hasVault: state.hasVault,
        isLocked: state.isLocked,
        vault: state.vault,
        backupConfirmed: state.backupConfirmed,
        createdAt: state.createdAt,
        accounts: state.accounts,
        nextAccountIndex: state.nextAccountIndex,
        activeAccountId: state.activeAccountId,
        authorizedSites: state.authorizedSites,
        autolockMinutes: state.autolockMinutes,
        lastActiveTimestamp: state.lastActiveTimestamp,
        network: state.network,
        servers: state.servers,
        activeServer: state.activeServer,
        enabledNetworks: state.enabledNetworks,
        offeredNetworks: state.offeredNetworks,
        coinServers: state.coinServers,
        discoveredServers: state.discoveredServers,
        peerDiscovery: state.peerDiscovery,
        lastDiscoveryAt: state.lastDiscoveryAt,
        assetInfo: state.assetInfo,
        sent: state.sent
      }),
      migrate: (persisted: any) => {
        const old = persisted ?? {}
        return {
          isInitialized: Boolean(old.isInitialized),
          hasVault: Boolean(old.hasVault),
          isLocked: true,
          vault: old.vault ?? null,
          backupConfirmed: Boolean(old.backupConfirmed),
          createdAt: old.createdAt ?? null,
          accounts: migrateAccounts(old.accounts),
          nextAccountIndex: Number(old.nextAccountIndex) || 1,
          activeAccountId: old.activeAccountId ?? null,
          authorizedSites: Array.isArray(old.authorizedSites) ? old.authorizedSites.map(String) : [],
          autolockMinutes: Number(old.autolockMinutes) || 5,
          lastActiveTimestamp: Date.now(),
          servers: normalizeServers(old.servers),
          activeServer: migrateServer(String(old.activeServer ?? '')),
          assetInfo: old.assetInfo && typeof old.assetInfo === 'object' ? old.assetInfo : {},
          sent: []
        } as Partial<WalletState>
      },
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<WalletState>
        const servers = normalizeServers(persisted.servers)
        const discoveredServers = mergePeers([], Array.isArray(persisted.discoveredServers) ? persisted.discoveredServers : [], Date.now())
        const selected = migrateServer(String(persisted.activeServer ?? ''))
        const activeServer = servers.includes(selected) || discoveredServers.some((p) => p.url === selected) ? selected : servers[0]
        const accounts = migrateAccounts(persisted.accounts)
        const legacy = persisted as Partial<WalletState> & { btczServers?: unknown; btczActiveServer?: unknown }
        const enabledNetworks = normalizeEnabled(persisted.enabledNetworks, persisted.offeredNetworks)
        const network = isNetworkId(persisted.network) && enabledNetworks.includes(persisted.network) ? persisted.network : 'rtm'
        return {
          ...currentState,
          ...persisted,
          accounts,
          network,
          enabledNetworks,
          offeredNetworks: [...DEFAULT_ENABLED_NETWORKS],
          servers,
          activeServer,
          coinServers: normalizeCoinServers(persisted.coinServers, { servers: legacy.btczServers, activeServer: legacy.btczActiveServer }),
          discoveredServers,
          peerDiscovery: persisted.peerDiscovery !== false,
          lastDiscoveryAt: Number(persisted.lastDiscoveryAt) || 0,
          activeAccountId: accounts.some((a) => a.id === persisted.activeAccountId) ? persisted.activeAccountId! : (accounts[0]?.id ?? null)
        }
      }
    }
  )
)

// ── unlocked session shared by the wallet's pages ───────────────────────────
// The side panel, popup windows and request screens are separate pages. The
// unlocked recovery phrase lives in chrome.storage.session: memory only,
// cleared when the browser closes or the wallet locks, and readable only by
// the extension's own pages (not content scripts). Unlocking or locking in one
// page applies to all of them.

const SESSION_STORAGE_KEY = 'metayoshi-session-v1'

function sessionArea(): chrome.storage.StorageArea | null {
  return typeof chrome !== 'undefined' && chrome.storage?.session ? chrome.storage.session : null
}

function sharedMnemonic(value: unknown): string | null {
  const mnemonic = (value as { mnemonic?: unknown } | undefined)?.mnemonic
  return typeof mnemonic === 'string' && mnemonic ? mnemonic : null
}

/** Adopts the session another page unlocked; locks when there is none (e.g. after a browser restart). */
async function restoreSharedSession(area: chrome.storage.StorageArea): Promise<void> {
  let mnemonic: string | null = null
  try {
    mnemonic = sharedMnemonic((await area.get(SESSION_STORAGE_KEY))[SESSION_STORAGE_KEY])
  } catch {
    // Unreadable session: treat as locked.
  }
  const state = useWalletStore.getState()
  if (!state.isInitialized || state.sessionMnemonic) return
  if (mnemonic) useWalletStore.setState({ isLocked: false, sessionMnemonic: mnemonic, lastActiveTimestamp: Date.now() })
  else if (!state.isLocked) state.lock()
}

function shareSessionAcrossPages(): void {
  const area = sessionArea()
  if (!area) return
  useWalletStore.subscribe((state, previous) => {
    if (state.sessionMnemonic === previous.sessionMnemonic) return
    const write = state.sessionMnemonic
      ? area.set({ [SESSION_STORAGE_KEY]: { mnemonic: state.sessionMnemonic } })
      : area.remove(SESSION_STORAGE_KEY)
    void write.catch(() => undefined)
  })
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'session' || !changes[SESSION_STORAGE_KEY]) return
    const mnemonic = sharedMnemonic(changes[SESSION_STORAGE_KEY].newValue)
    const state = useWalletStore.getState()
    if (mnemonic && mnemonic !== state.sessionMnemonic && state.isInitialized) {
      useWalletStore.setState({ isLocked: false, sessionMnemonic: mnemonic, lastActiveTimestamp: Date.now() })
      if (state.connection === 'disconnected') void useWalletStore.getState().connect()
    } else if (!mnemonic && state.sessionMnemonic) {
      state.lock()
    }
  })
  if (useWalletStore.persist.hasHydrated()) void restoreSharedSession(area)
  else useWalletStore.persist.onFinishHydration(() => void restoreSharedSession(area))
}

shareSessionAcrossPages()

export { addressToScriptHash }
