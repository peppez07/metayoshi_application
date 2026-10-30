import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import { decryptVaultV1, encryptVaultV1, type EncryptedVaultV1 } from '../lib/vaultCrypto'
import { WALLET_STORAGE_KEY } from '../lib/walletStorage'
import { addressToScript, addressToScriptHash, clearSeedCache, deriveAccountKey, isValidAddress, isValidMnemonic } from '../lib/rtm/address'
import { formatUnits, parseUnits } from '../lib/rtm/amount'
import { buildAssetSend, buildNativeSend, type BuiltTransaction } from '../lib/rtm/builder'
import { describeTx, headerTime } from '../lib/rtm/history'
import { parseTx, type Transaction } from '../lib/rtm/transaction'
import { BUILTIN_ELECTRUM_SERVER, LEGACY_ELECTRUM_SERVER, closeClient, DEFAULT_ELECTRUM_SERVERS, getClient, isValidServerUrl, RtmElectrum, type AssetMetadata } from '../lib/electrum/rtmElectrum'

export const RTM_DECIMALS = 8
export const RTM_SYMBOL = 'RTM'
export const EXPLORER_URL = String(import.meta.env.VITE_RTM_EXPLORER || 'https://explorer.raptoreum.com').replace(/\/+$/, '')
const HISTORY_LIMIT = 30
const MAX_ACTIVITY_PREV_TX = 400

export interface Account {
  id: string
  name: string
  derivationIndex: number
  address: string
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
  accountId: string
  to: string
  amount: string
  assetId?: string
  timestamp: number
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface PreparedSend {
  kind: 'rtm' | 'asset'
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
  servers: string[]
  activeServer: string
  assetInfo: Record<string, AssetInfo>
  sent: SentRecord[]

  // session only
  sessionMnemonic: string | null
  connection: ConnectionStatus
  connectionError: string
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

  addAuthorizedSite: (origin: string) => void
  removeAuthorizedSite: (origin: string) => void

  addServer: (url: string) => void
  removeServer: (url: string) => void
  setActiveServer: (url: string) => Promise<void>

  connect: () => Promise<void>
  refresh: () => Promise<void>
  loadAssetInfo: (assetId: string) => Promise<AssetInfo | null>
  prepareRtmSend: (params: { to: string; amount: string; sendMax?: boolean }) => Promise<PreparedSend>
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

function normalizeServers(list: unknown): string[] {
  const values = Array.isArray(list) ? list.map((s) => migrateServer(String(s || '').trim())).filter(isValidServerUrl) : []
  const unique = Array.from(new Set(values))
  return unique.length > 0 ? unique : [...DEFAULT_ELECTRUM_SERVERS]
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
    accounts.push({
      id: String(item.id || `acc-${derivationIndex + 1}`),
      name: String(legacyName || item.name || `Account ${derivationIndex + 1}`).trim(),
      derivationIndex,
      address: isValidAddress(address) ? address : ''
    })
  })
  return accounts
}

async function deriveAccounts(mnemonic: string, accounts: Account[]): Promise<Account[]> {
  return Promise.all(accounts.map(async (a) => ({ ...a, address: (await deriveAccountKey(mnemonic, a.derivationIndex)).address })))
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
const txCache = new Map<string, Transaction>()
const headerTimeCache = new Map<number, number>()

/** `height` comes from the address history; it lets servers without Core txindex answer. */
async function fetchTx(txid: string, height: number): Promise<Transaction> {
  const cached = txCache.get(txid)
  if (cached) return cached
  if (!api) throw new Error('Not connected')
  const tx = parseTx(await api.getTransactionAt(txid, height))
  if (txCache.size > MAX_ACTIVITY_PREV_TX) txCache.delete(txCache.keys().next().value as string)
  txCache.set(txid, tx)
  return tx
}

async function blockTime(height: number): Promise<number | null> {
  if (height <= 0 || !api) return null
  const cached = headerTimeCache.get(height)
  if (cached) return cached
  const time = headerTime(await api.blockHeader(height))
  headerTimeCache.set(height, time)
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

// ── store ────────────────────────────────────────────────────────────────────

const SESSION_DEFAULTS = {
  sessionMnemonic: null,
  connection: 'disconnected' as ConnectionStatus,
  connectionError: '',
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

      const signingKey = async (accountId: string) => {
        const { sessionMnemonic, accounts, isLocked } = get()
        if (isLocked || !sessionMnemonic) throw new Error('Wallet is locked')
        const account = accounts.find((a) => a.id === accountId)
        if (!account) throw new Error('Account not found')
        const key = await deriveAccountKey(sessionMnemonic, account.derivationIndex)
        if (account.address && key.address !== account.address) throw new Error('Derived key does not match the account address')
        return { account, key }
      }

      const subscribeActive = async (): Promise<void> => {
        const account = activeAccountOf(get())
        if (!api || !account?.address) return
        await api.subscribeAddress(account.address).catch(() => null)
        if (get().assetsReady) await api.subscribeAssets(account.address).catch(() => null)
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
        servers: [...DEFAULT_ELECTRUM_SERVERS],
        activeServer: DEFAULT_ELECTRUM_SERVERS[0],
        assetInfo: {},
        sent: [],
        ...SESSION_DEFAULTS,

        initialize: async (password, mnemonic) => {
          const phrase = mnemonic.trim().toLowerCase().split(/\s+/).join(' ')
          if (!isValidMnemonic(phrase)) throw new Error('Invalid recovery phrase')
          const vault = await encryptVaultV1({ password, mnemonic: phrase })
          const first = await deriveAccountKey(phrase, 0)
          set({
            isInitialized: true,
            hasVault: true,
            isLocked: false,
            vault,
            backupConfirmed: false,
            createdAt: Date.now(),
            sessionMnemonic: phrase,
            accounts: [{ id: 'acc-1', name: 'Account 1', derivationIndex: 0, address: first.address }],
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
            : [{ id: 'acc-1', name: 'Account 1', derivationIndex: 0, address: '' }]
          const accounts = await deriveAccounts(mnemonic, existing)
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
          const key = await deriveAccountKey(sessionMnemonic, derivationIndex)
          const account: Account = {
            id: newAccountId(),
            name: String(name || '').trim() || `Account ${derivationIndex + 1}`,
            derivationIndex,
            address: key.address
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

        addAuthorizedSite: (origin) => set((state) => ({
          authorizedSites: state.authorizedSites.includes(origin) ? state.authorizedSites : [...state.authorizedSites, origin]
        })),

        removeAuthorizedSite: (origin) => set((state) => ({
          authorizedSites: state.authorizedSites.filter((site) => site !== origin)
        })),

        addServer: (url) => {
          const value = url.trim()
          if (!isValidServerUrl(value)) throw new Error('Use an HTTPS or WebSocket URL without credentials or fragments')
          set((state) => ({ servers: state.servers.includes(value) ? state.servers : [...state.servers, value] }))
        },

        removeServer: (url) => set((state) => {
          const servers = state.servers.filter((s) => s !== url)
          const next = servers.length > 0 ? servers : [...DEFAULT_ELECTRUM_SERVERS]
          return { servers: next, activeServer: next.includes(state.activeServer) ? state.activeServer : next[0] }
        }),

        setActiveServer: async (url) => {
          if (!get().servers.includes(url)) get().addServer(url)
          set({ activeServer: url })
          teardownSession()
          await get().connect()
        },

        connect: async () => {
          if (api && get().connection === 'connected') return
          if (get().connection === 'connecting') return
          set({ connection: 'connecting', connectionError: '' })
          const { activeServer, servers } = get()
          const candidates = [activeServer, ...servers.filter((s) => s !== activeServer)]
          const errors: string[] = []
          for (const url of candidates) {
            teardownSession()
            const client = getClient(url)
            const candidate = new RtmElectrum(client)
            try {
              const features = await candidate.verifyNetwork()
              api = candidate
              const tip = await candidate.tipHeight()
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
              set({
                connection: 'connected',
                connectionError: '',
                activeServer: url,
                serverVersion: features.serverVersion,
                assetsReady: features.assetsReady,
                tipHeight: tip
              })
              await subscribeActive()
              await get().refresh()
              return
            } catch (error) {
              errors.push(`${url}: ${errorMessage(error)}`)
            }
          }
          teardownSession()
          set({ connection: 'error', connectionError: errors.join('\n') || 'No ElectrumX server configured' })
          scheduleReconnect()
        },

        refresh: async () => {
          const account = activeAccountOf(get())
          if (!api || !account?.address || get().refreshing) return
          set({ refreshing: true })
          try {
            const server = requireApi()
            const [balance, history] = await Promise.all([server.balance(account.address), server.history(account.address)])
            const holdings = get().assetsReady ? await server.assetBalances(account.address) : []
            set((state) => ({
              balances: { ...state.balances, [account.id]: { confirmed: balance.confirmed.toString(), unconfirmed: balance.unconfirmed.toString() } },
              assets: {
                ...state.assets,
                [account.id]: holdings
                  .filter((h) => h.confirmed + h.unconfirmed > 0n)
                  .map((h) => ({ assetId: h.assetId, confirmed: h.confirmed.toString(), unconfirmed: h.unconfirmed.toString() }))
              }
            }))
            for (const h of holdings) if (!get().assetInfo[h.assetId]) void get().loadAssetInfo(h.assetId)

            const ownScript = addressToScript(account.address)
            const recent = [...history]
              .sort((a, b) => (a.height <= 0 ? Number.MAX_SAFE_INTEGER : a.height) - (b.height <= 0 ? Number.MAX_SAFE_INTEGER : b.height))
              .slice(-HISTORY_LIMIT)
              .reverse()
            const previous = new Map((get().activity[account.id] ?? []).map((item) => [item.txid, item]))
            // An input can only spend our output if its funding tx is in our history.
            const heights = new Map(history.map((h) => [h.txid, h.height]))
            const fetchOwnPrev = async (txid: string) => {
              const height = heights.get(txid)
              return height === undefined ? null : fetchTx(txid, height)
            }
            const items: ActivityItem[] = []
            for (const entry of recent) {
              const known = previous.get(entry.txid)
              if (known && known.height === entry.height && (entry.height <= 0 || known.timestamp)) {
                items.push(known)
                continue
              }
              try {
                const effect = await describeTx(await fetchTx(entry.txid, entry.height), ownScript, fetchOwnPrev)
                items.push({
                  txid: entry.txid,
                  height: entry.height,
                  timestamp: await blockTime(entry.height).catch(() => null),
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
              activity: { ...state.activity, [account.id]: items },
              sent: state.sent.filter((s) => !seen.has(s.txid) && Date.now() - s.timestamp < 3 * 3600_000),
              lastRefreshAt: Date.now()
            }))
          } catch (error) {
            set({ connectionError: errorMessage(error) })
          } finally {
            set({ refreshing: false })
          }
        },

        loadAssetInfo: async (assetId) => {
          const cached = get().assetInfo[assetId]
          if (cached) return cached
          if (!api) return null
          const metadata = await api.assetMetadata(assetId).catch(() => null)
          if (!metadata) return null
          const info = toAssetInfo(metadata)
          set((state) => ({ assetInfo: { ...state.assetInfo, [assetId]: info } }))
          return info
        },

        prepareRtmSend: async ({ to, amount, sendMax }) => {
          const server = requireApi()
          const account = activeAccountOf(get())
          if (!account) throw new Error('No account')
          const recipient = to.trim()
          if (!isValidAddress(recipient)) throw new Error('Enter a valid Raptoreum address')
          const value = sendMax ? 0n : parseUnits(amount, RTM_DECIMALS)
          if (!sendMax && value <= 0n) throw new Error('Amount must be greater than zero')
          const { key } = await signingKey(account.id)
          const [coins, feePerByte] = await Promise.all([server.listUnspent(account.address), server.feePerByte()])
          const built: BuiltTransaction = buildNativeSend({
            senderAddress: account.address,
            privateKey: key.privateKey,
            coins,
            outputs: [{ address: recipient, value }],
            feePerByte,
            sendMax
          })
          return {
            kind: 'rtm',
            accountId: account.id,
            from: account.address,
            to: recipient,
            amount: formatRtm(built.sent),
            fee: formatRtm(built.fee),
            hex: built.hex,
            txid: built.txid,
            size: built.size
          }
        },

        prepareAssetSend: async ({ assetId, to, amount }) => {
          const server = requireApi()
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
          const txid = await requireApi().broadcast(prepared.hex)
          if (txid !== prepared.txid) throw new Error(`Server returned unexpected txid ${txid}`)
          set((state) => ({
            sent: [
              { txid, accountId: prepared.accountId, to: prepared.to, amount: prepared.amount, assetId: prepared.assetId, timestamp: Date.now() },
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
            servers: state.servers
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
          const accounts = await deriveAccounts(mnemonic, migrated.length > 0 ? migrated : [{ id: 'acc-1', name: 'Account 1', derivationIndex: 0, address: '' }])
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
        servers: state.servers,
        activeServer: state.activeServer,
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
        const selected = migrateServer(String(persisted.activeServer ?? ''))
        const activeServer = servers.includes(selected) ? selected : servers[0]
        const accounts = migrateAccounts(persisted.accounts)
        return {
          ...currentState,
          ...persisted,
          accounts,
          servers,
          activeServer,
          activeAccountId: accounts.some((a) => a.id === persisted.activeAccountId) ? persisted.activeAccountId! : (accounts[0]?.id ?? null)
        }
      }
    }
  )
)

export { addressToScriptHash }
