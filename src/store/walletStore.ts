import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import { ethers } from 'ethers'
import { decryptVaultV1, encryptVaultV1, type EncryptedVaultV1 } from '../lib/vaultCrypto'
import { normalizeDappOrigin } from '../lib/dappPermissions'
import { WALLET_STORAGE_KEY } from '../lib/walletStorage'
import {
  getUtxoBalance, sendRawTransaction, createRawTransaction, listUtxoUnspent,
  getAddressUtxos, getAddressMempoolSpentOutpoints, listAssetBalancesByAddress, sendRtmAssetNonCustodial,
  getBlockchainInfo, scanAddressUnspent, validateAddress, getAssetDetailsByName, sendToAddress,
  type RtmAssetDetails,
  type UtxoRpcConfig
} from '../lib/utxoRpc'
import { resolveBridgeTxKeyCandidates } from '../lib/bridgeAuth'
import { deriveUtxoAddress, deriveUtxoAddressWithSpec, isAddressForCoinSymbol } from '../lib/utxoAddress'
import { deriveXrpAddress } from '../lib/xrpAddress'
import { getXrpAccountBalance } from '../lib/xrpRpc'
import { signLegacyP2pkhTransaction, signBtczTransparentTransaction, type UnsignedTxInput } from '../lib/utxoSign'
import { MIN_SYNC_PERCENT_FOR_SEND } from '../lib/sendSyncPolicy'
import { resolveNetworkCapabilities } from '../lib/networkCapabilities'
import {
  DEFAULT_ACTIVE_NETWORK_ID,
  DEFAULT_NETWORK_ID,
  INITIAL_NETWORKS,
  estimateNetworkFee
} from '../coins'
import { getCoinApiInterceptor } from '../coins/interceptors'
import type { CoinType, Network } from '../coins'
import { useApiMonitorStore } from './apiMonitorStore'

export type { CoinType, Network } from '../coins'

// ── Full backup format ────────────────────────────────────────────────────────

export interface FullBackupV1 {
  type: 'metayoshi-full-backup'
  version: 1
  createdAt: number
  /** Password-encrypted vault containing the mnemonic. */
  vault: import('../lib/vaultCrypto').EncryptedVaultV1
  accounts: Account[]
  nextAccountIndex: number
  activeAccountId: string | null
  activeNetworkId: string
  activity: Activity[]
  authorizedSites: string[]
  autolockMinutes: number
  backupConfirmed: boolean
  networkAssets: Record<string, Record<string, number>>
}

export interface Account {
  id: string
  name: string
  /** BIP44 account index used for deterministic derivation. */
  derivationIndex: number
  addresses: Record<CoinType, string>
  /** Per-network derived addresses, keyed by network id */
  networkAddresses: Record<string, string>
  /** Per-network cached balance strings, keyed by network id. */
  networkBalances: Record<string, string>
  balance: string
}

export interface Activity {
  id: string
  type: 'sent' | 'received' | 'swap'
  asset: string
  amount: string
  to?: string
  from?: string
  accountId?: string
  status: 'pending' | 'confirmed' | 'rejected'
  timestamp: number
  networkId: string
}

interface WalletState {
  // Auth state
  isInitialized: boolean
  hasVault: boolean
  isLocked: boolean
  vault: EncryptedVaultV1 | null
  backupConfirmed: boolean
  createdAt: number | null
  sessionMnemonic: string | null

  // Wallet state
  accounts: Account[]
  nextAccountIndex: number
  activeAccountId: string | null
  activeNetworkId: string
  networks: Network[]

  // App state
  isConnected: boolean
  isSyncing: boolean
  /** Sync percentage for current network when known (0-100). */
  syncPercent: number | null
  /** Consecutive refresh checks below the safe sync threshold. */
  lowSyncStreak: number
  /** Monotonic id for active balance refresh requests. */
  balanceRefreshNonce: number
  /** Per-network asset balances. Key = networkId, value = { assetName: rawAmount (sats) } */
  networkAssets: Record<string, Record<string, number>>
  authorizedSites: string[]
  autolockMinutes: number
  lastActiveTimestamp: number
  activity: Activity[]

  // Local RPC mode — bypasses the MetaYoshi bridge when enabled
  useLocalRpc: boolean
  /** Per-network local node settings, keyed by network id. */
  localRpcOverrides: Record<string, {
    rpcUrl: string
    rpcUsername: string
    rpcPassword: string
    rpcWallet: string
  }>

  // Actions
  initialize: (password: string, mnemonic: string) => Promise<void>
  unlock: (password: string) => Promise<boolean>
  verifyPassword: (password: string) => Promise<boolean>
  signBackendAuthMessage: (message: string) => Promise<{ address: string; signature: string }>
  lock: () => void
  setLocked: (locked: boolean) => void
  setInitialized: (initialized: boolean) => void
  setBackupConfirmed: (confirmed: boolean) => void
  wipeVault: () => void
  
  setActiveAccount: (id: string) => void
  setActiveNetwork: (id: string) => Promise<void>
  ensureNetworkAddress: (networkId: string) => Promise<string | null>
  
  setConnected: (connected: boolean) => void
  setSyncing: (syncing: boolean) => void
  
  addAuthorizedSite: (origin: string) => void
  removeAuthorizedSite: (origin: string) => void
  
  setAutolock: (minutes: number) => void
  updateLastActive: () => void
  checkAutolock: () => void
  
  addActivity: (item: Activity) => void
  changePassword: (oldPass: string, newPass: string) => boolean
  
  // Account management
  addAccount: (name: string, networkId?: string) => Promise<void>
  removeAccount: (id: string) => void
  updateAccount: (id: string, updates: Partial<Account>) => void
  
  // Network management
  addNetwork: (network: Network) => void
  removeNetwork: (id: string) => void
  updateNetwork: (id: string, updates: Partial<Network>) => void

  // Local RPC settings
  setUseLocalRpc: (enabled: boolean) => void
  setLocalRpcOverride: (networkId: string, override: {
    rpcUrl: string
    rpcUsername: string
    rpcPassword: string
    rpcWallet: string
  }) => void

  // RPC
  refreshActiveBalance: (options?: { fast?: boolean; skipZeroBalanceRecheck?: boolean }) => Promise<void>
  sendEvmTransaction: (params: { to: string; amount: string }) => Promise<{ hash: string }>
  sendXrpTransaction: (params: { to: string; amount: string }) => Promise<{ hash: string }>
  sendUtxoTransaction: (params: {
    to: string
    amount: string
    donation?: {
      address: string
      amount: string
      required?: boolean
    }
  }) => Promise<{ hash: string }>

  // Full backup / restore
  fullRestore: (params: {
    backup: FullBackupV1
    backupPassword: string
    newPassword: string
  }) => Promise<void>

  // RTM asset layer
  fetchNetworkAssets: () => Promise<void>
  fetchAssetDetails: (assetId: string) => Promise<RtmAssetDetails>
  sendRtmAsset: (params: {
    assetId: string
    qty: string
    toAddress: string
    changeAddress?: string
    assetChangeAddress?: string
  }) => Promise<{ txid: string }>
}

const BALANCE_UI_STABILIZE_MS = 650
const UTXO_ZERO_BALANCE_RECHECK_MS = 900

function delay(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isTransientBridgeFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return (
    /rpc call failed \[bridge\]: http 5\d\d/i.test(message)
    || /secure bridge .*http 5\d\d/i.test(message)
    || /bad gateway/i.test(message)
    || /rpc error \[[^\]]+\]: fetch failed/i.test(message)
    || /rpc call failed \[bridge\]:.*\bfetch failed\b/i.test(message)
  )
}

function isClientSignerFormatError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return (
    /offset is outside the bounds of the dataview/i.test(message)
    || /failed to parse unsigned legacy transaction/i.test(message)
    || /unsupported varint size/i.test(message)
    || /invalid typed array length/i.test(message)
    || /input count mismatch/i.test(message)
  )
}

async function createUtxoRpcConfig(
  net: Network,
  opts: {
    useLocalRpc?: boolean
    localRpcOverride?: { rpcUrl: string; rpcUsername: string; rpcPassword: string; rpcWallet: string }
    secureBridgeSigner?: (message: string) => Promise<{ address: string; signature: string }>
  } = {}
): Promise<UtxoRpcConfig> {
  const override = opts.localRpcOverride
  const effectiveBridgePassword = String(net.bridgePassword || '').trim()
  const bridgeTxKeyCandidates = await resolveBridgeTxKeyCandidates({
    fallbackSecret: effectiveBridgePassword
  })
  const bridgeTxKey = bridgeTxKeyCandidates[0]
  const secureBridgeWritesEnabled = (() => {
    const normalized = String(import.meta.env.VITE_BRIDGE_SECURE_WRITES_ENABLED ?? 'true').trim().toLowerCase()
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false
    return true
  })()
  const secureBridgeApiBaseUrl = String(import.meta.env.VITE_SECURE_BRIDGE_API_BASE_URL || '').trim()

  return {
    networkId: net.id,
    coinSymbol: net.symbol,
    apiInterceptor: getCoinApiInterceptor(net.id),
    // Local RPC fields — use user override if set, otherwise fall back to network defaults
    rpcUrl:      (override?.rpcUrl?.trim())      || net.rpcUrl,
    rpcWallet:   (override?.rpcWallet?.trim())   || net.rpcWallet,
    rpcUsername: (override?.rpcUsername?.trim()) || net.rpcUsername,
    rpcPassword: (override?.rpcPassword?.trim()) || net.rpcPassword,
    // Bridge fields
    bridgeUrl:      net.bridgeUrl,
    bridgeUsername: net.bridgeUsername,
    bridgePassword: net.bridgePassword,
    bridgeTxKey,
    bridgeTxKeyCandidates,
    secureBridgeApiBaseUrl: secureBridgeApiBaseUrl || undefined,
    secureBridgeWritesEnabled,
    secureBridgeSigner: opts.secureBridgeSigner,
    useLocalRpc: opts.useLocalRpc ?? false
  }
}

function evmDerivationPath(accountIndex: number): string {
  return `m/44'/60'/${accountIndex}'/0/0`
}

function deriveEvmWallet(mnemonic: string, accountIndex: number): ethers.HDNodeWallet {
  return ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, evmDerivationPath(accountIndex))
}

function supportsAddressIndex(coinSymbol?: string): boolean {
  const symbol = String(coinSymbol || '').trim().toUpperCase()
  return symbol === 'RTM' || symbol === 'BTCZ' || symbol === 'TIDE' || symbol === 'FIRO'
}

// Balance refresh should avoid noisy address-index probes on bridges that do not
// support them reliably for unfunded addresses.
function supportsAddressIndexBalance(coinSymbol?: string): boolean {
  const symbol = String(coinSymbol || '').trim().toUpperCase()
  return symbol === 'RTM' || symbol === 'BTCZ' || symbol === 'TIDE'
}

function shouldForceCanonicalUtxoAddress(coinSymbol?: string): boolean {
  const symbol = String(coinSymbol || '').trim().toUpperCase()
  // Tide was previously derived with a legacy coin-type path; always re-derive
  // from the current canonical path when network address resolution runs.
  return symbol === 'TIDE'
}

const TIDE_LEGACY_ADDRESS_SPEC = {
  bip44CoinType: 200,
  p2pkhVersion: 0x21
} as const

async function deriveSigningKeyForSenderAddress(
  mnemonic: string,
  net: Network,
  accountIndex: number,
  senderAddress: string
): Promise<{ address: string; pubHex: string; privHex: string }> {
  if (!net.coinSymbol) throw new Error('Network missing coinSymbol')
  const normalizedSender = String(senderAddress || '').trim()
  if (!normalizedSender) throw new Error('Sender address is required')

  const canonical = await deriveUtxoAddress(mnemonic, net.coinSymbol, accountIndex, 0, 0)
  if (canonical.address === normalizedSender) return canonical

  if (String(net.coinSymbol).trim().toUpperCase() === 'TIDE') {
    const legacy = await deriveUtxoAddressWithSpec(mnemonic, TIDE_LEGACY_ADDRESS_SPEC, accountIndex, 0, 0)
    if (legacy.address === normalizedSender) {
      console.warn(`[${net.symbol}] using legacy coin-type signing path for address ${normalizedSender}`)
      return legacy
    }
  }

  throw new Error(`Could not derive signing key for ${net.symbol} sender address ${normalizedSender}`)
}

function resolveDerivationIndex(account: Partial<Account>, fallback: number): number {
  if (typeof account.derivationIndex === 'number' && account.derivationIndex >= 0) {
    return account.derivationIndex
  }
  return fallback >= 0 ? fallback : 0
}

function getCachedBalanceForNetwork(
  account: Partial<Account> | undefined,
  networkId: string,
  fallbackToLegacy = false
): string {
  if (!account) return '0'
  const normalizedNetworkId = String(networkId || '').trim()
  const byNetwork = String(account.networkBalances?.[normalizedNetworkId] ?? '').trim()
  if (byNetwork) return byNetwork
  if (!fallbackToLegacy) return '0'
  const legacy = String(account.balance ?? '').trim()
  return legacy || '0'
}

async function deriveAccountAddresses(
  mnemonic: string,
  networks: Network[],
  derivationIndex: number
): Promise<{
  addresses: Record<CoinType, string>
  networkAddresses: Record<string, string>
  derivationErrors: string[]
}> {
  const evmWallet = deriveEvmWallet(mnemonic, derivationIndex)
  const networkAddresses: Record<string, string> = {}
  const derivationErrors: string[] = []
  let firstUtxoAddress = ''
  let firstXrpAddress = ''

  for (const net of networks) {
    if (net.coinType === 'UTXO' && net.coinSymbol) {
      try {
        const utxo = await deriveUtxoAddress(mnemonic, net.coinSymbol, derivationIndex, 0, 0)
        networkAddresses[net.id] = utxo.address
        if (!firstUtxoAddress) firstUtxoAddress = utxo.address
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        derivationErrors.push(`${net.symbol}: ${msg}`)
        console.warn(`Failed to derive ${net.coinSymbol} address (account ${derivationIndex}):`, err)
      }
    } else if (net.coinType === 'XRP') {
      try {
        const xrp = await deriveXrpAddress(mnemonic, derivationIndex)
        networkAddresses[net.id] = xrp.address
        if (!firstXrpAddress) firstXrpAddress = xrp.address
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        derivationErrors.push(`${net.symbol}: ${msg}`)
        console.warn(`Failed to derive XRP address (account ${derivationIndex}):`, err)
      }
    } else if (net.coinType === 'EVM') {
      networkAddresses[net.id] = evmWallet.address
    }
  }

  return {
    addresses: {
      EVM: evmWallet.address,
      UTXO: firstUtxoAddress,
      BTC: '',
      SOL: '',
      XRP: firstXrpAddress
    },
    networkAddresses,
    derivationErrors
  }
}

function normalizePersistedAccounts(rawAccounts: unknown): Account[] {
  if (!Array.isArray(rawAccounts)) return []

  return rawAccounts.map((raw, index) => {
    const candidate = (raw ?? {}) as Partial<Account>
    const addresses = candidate.addresses ?? ({} as Record<CoinType, string>)
    const networkAddresses = candidate.networkAddresses ?? {}
    const networkBalances = candidate.networkBalances ?? {}

    return {
      id: typeof candidate.id === 'string' ? candidate.id : `acc-${index + 1}`,
      name: typeof candidate.name === 'string' ? candidate.name : `Account ${index + 1}`,
      derivationIndex: resolveDerivationIndex(candidate, index),
      addresses: {
        EVM: addresses.EVM ?? '',
        UTXO: addresses.UTXO ?? '',
        BTC: addresses.BTC ?? '',
        SOL: addresses.SOL ?? '',
        XRP: addresses.XRP ?? ''
      },
      networkAddresses: { ...networkAddresses },
      networkBalances: { ...networkBalances },
      balance: typeof candidate.balance === 'string' ? candidate.balance : '0'
    }
  })
}

function hasChromeStorageLocal(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local)
}

function readLocalStorageSafe(name: string): string | null {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage.getItem(name)
  } catch {
    return null
  }
}

function writeLocalStorageSafe(name: string, value: string): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(name, value)
  } catch {
    // ignore storage write errors
  }
}

function removeLocalStorageSafe(name: string): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.removeItem(name)
  } catch {
    // ignore storage remove errors
  }
}

const extensionStateStorage: StateStorage = {
  getItem: async (name) => {
    if (hasChromeStorageLocal()) {
      const stored = await chrome.storage.local.get(name)
      const raw = stored[name]

      if (raw !== undefined) {
        if (typeof raw === 'string') return raw
        if (raw && typeof raw === 'object' && 'state' in (raw as Record<string, unknown>)) {
          return JSON.stringify(raw)
        }
        return JSON.stringify({ state: raw, version: 0 })
      }

      const legacy = readLocalStorageSafe(name)
      if (legacy) {
        try {
          const parsed = JSON.parse(legacy) as unknown
          await chrome.storage.local.set({ [name]: parsed })
          removeLocalStorageSafe(name)
        } catch {
          await chrome.storage.local.set({ [name]: legacy })
        }
      }

      return legacy
    }

    return readLocalStorageSafe(name)
  },

  setItem: async (name, value) => {
    if (hasChromeStorageLocal()) {
      let parsed: unknown = value
      try {
        parsed = JSON.parse(value)
      } catch {
        parsed = value
      }
      await chrome.storage.local.set({ [name]: parsed })
      removeLocalStorageSafe(name)
      return
    }

    writeLocalStorageSafe(name, value)
  },

  removeItem: async (name) => {
    if (hasChromeStorageLocal()) {
      await chrome.storage.local.remove(name)
    }
    removeLocalStorageSafe(name)
  }
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      isInitialized: false,
      hasVault: false,
      isLocked: true,
      vault: null,
      backupConfirmed: false,
      createdAt: null,
      sessionMnemonic: null,
      
      accounts: [],
      nextAccountIndex: 1,
      activeAccountId: null,
      activeNetworkId: DEFAULT_ACTIVE_NETWORK_ID,
      networks: INITIAL_NETWORKS,
      
      isConnected: false,
      isSyncing: false,
      syncPercent: null,
      lowSyncStreak: 0,
      balanceRefreshNonce: 0,
      networkAssets: {},
      authorizedSites: [],
      autolockMinutes: 5,
      lastActiveTimestamp: Date.now(),
      useLocalRpc: false,
      localRpcOverrides: {},
      activity: [
        {
          id: '1',
          type: 'sent',
          asset: 'RTM',
          amount: '1',
          to: 'RGG...vcFFDFdffd',
          status: 'confirmed',
          timestamp: Date.now() - 3600000,
          networkId: 'rtm-mainnet'
        },
        {
          id: '2',
          type: 'sent',
          asset: 'ASSETNAME',
          amount: '1',
          to: 'RGG...vcFFDFdffd',
          status: 'confirmed',
          timestamp: Date.now() - 7200000,
          networkId: 'rtm-mainnet'
        }
      ],

      initialize: async (password, mnemonic) => {
        const vault = await encryptVaultV1({ password, mnemonic })
        const normalizedMnemonic = mnemonic.trim()

        const networks = get().networks
        const derived = await deriveAccountAddresses(normalizedMnemonic, networks, 0)
        const utxoNetworks = networks.filter((n) => n.coinType === 'UTXO')
        const derivedUtxoCount = utxoNetworks.filter((n) => Boolean(derived.networkAddresses[n.id])).length
        if (utxoNetworks.length > 0 && derivedUtxoCount === 0) {
          throw new Error(`Could not derive any wallet address.\n${derived.derivationErrors.join('\n')}`)
        }

        const initialAccount: Account = {
          id: 'acc-1',
          name: 'Account 1',
          derivationIndex: 0,
          addresses: derived.addresses,
          networkAddresses: derived.networkAddresses,
          networkBalances: {},
          balance: '0'
        }

        set({
          isInitialized: true,
          hasVault: true,
          isLocked: false,
          vault,
          backupConfirmed: false,
          createdAt: Date.now(),
          sessionMnemonic: normalizedMnemonic,
          accounts: [initialAccount],
          nextAccountIndex: 1,
          activeAccountId: 'acc-1',
          lastActiveTimestamp: Date.now()
        })

        void get().refreshActiveBalance().catch((err) => {
          console.warn('Initial balance refresh failed:', err)
        })
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

      signBackendAuthMessage: async (message) => {
        const { isLocked, sessionMnemonic, accounts, activeAccountId } = get()
        if (isLocked || !sessionMnemonic) throw new Error('Wallet is locked')

        const activeAccount = accounts.find((a) => a.id === activeAccountId) || accounts[0]
        if (!activeAccount) throw new Error('No active account')

        const fallbackIndex = accounts.findIndex((a) => a.id === activeAccount.id)
        const derivationIndex = resolveDerivationIndex(activeAccount, fallbackIndex)
        const evmWallet = deriveEvmWallet(sessionMnemonic, derivationIndex)
        const signature = await evmWallet.signMessage(String(message || ''))
        return { address: evmWallet.address, signature }
      },

      unlock: async (password) => {
        const { vault } = get()
        if (!vault) return false
        try {
          const plain = await decryptVaultV1({ password, vault })
          const normalizedMnemonic = plain.mnemonic.trim()
          const networks = get().networks
          const existingAccounts = get().accounts
          const sourceAccounts: Account[] = existingAccounts.length > 0
            ? existingAccounts
            : [{
              id: 'acc-1',
              name: 'Account 1',
              derivationIndex: 0,
              addresses: { EVM: '', UTXO: '', BTC: '', SOL: '', XRP: '' },
              networkAddresses: {},
              networkBalances: {},
              balance: '0'
            }]

          const nextAccounts: Account[] = []
          for (let i = 0; i < sourceAccounts.length; i++) {
            const account = sourceAccounts[i]
            const derivationIndex = resolveDerivationIndex(account, i)
            const derived = await deriveAccountAddresses(normalizedMnemonic, networks, derivationIndex)

            nextAccounts.push({
              ...account,
              derivationIndex,
              addresses: {
                EVM: derived.addresses.EVM || account.addresses?.EVM || '',
                UTXO: derived.addresses.UTXO || account.addresses?.UTXO || '',
                BTC: account.addresses?.BTC || '',
                SOL: account.addresses?.SOL || '',
                XRP: derived.addresses.XRP || account.addresses?.XRP || ''
              },
              networkAddresses: {
                ...(account.networkAddresses ?? {}),
                ...derived.networkAddresses
              }
            })
          }

          const highestDerivationIndex = nextAccounts.reduce(
            (max, account) => Math.max(max, account.derivationIndex),
            -1
          )
          const nextAccountIndex = Math.max(1, highestDerivationIndex + 1)
          const activeAccountId = get().activeAccountId
          const safeActiveAccountId = nextAccounts.some((a) => a.id === activeAccountId)
            ? activeAccountId
            : (nextAccounts[0]?.id ?? null)

          set({
            isLocked: false,
            hasVault: true,
            isInitialized: true,
            sessionMnemonic: normalizedMnemonic,
            createdAt: plain.createdAt ?? Date.now(),
            accounts: nextAccounts,
            nextAccountIndex,
            activeAccountId: safeActiveAccountId,
            lastActiveTimestamp: Date.now()
          })
          void get().refreshActiveBalance().catch((err) => {
            console.warn('Unlock balance refresh failed:', err)
          })
          return true
        } catch {
          return false
        }
      },

      lock: () => set({ isLocked: true, sessionMnemonic: null }),
      setLocked: (locked) => set({ isLocked: locked }),
      setInitialized: (initialized) => set({ isInitialized: initialized }),
      setBackupConfirmed: (confirmed) => set({ backupConfirmed: confirmed }),
      wipeVault: () =>
        set({
          isInitialized: false,
          hasVault: false,
          isLocked: true,
          vault: null,
          backupConfirmed: false,
          createdAt: null,
          sessionMnemonic: null,
          accounts: [],
          nextAccountIndex: 1,
          activeAccountId: null,
          syncPercent: null,
          lowSyncStreak: 0,
          activity: []
        }),

      setActiveAccount: (id) => {
        const { activeNetworkId } = get()
        set((state) => ({
          activeAccountId: id,
          lastActiveTimestamp: Date.now(),
          accounts: state.accounts.map((account) => (
            account.id === id
              ? { ...account, balance: getCachedBalanceForNetwork(account, activeNetworkId, false) }
              : account
          )),
          // Prevent showing stale assets from the previous account while reloading.
          networkAssets: {
            ...state.networkAssets,
            [activeNetworkId]: {}
          }
        }))
        void (async () => {
          await get().ensureNetworkAddress(activeNetworkId)
          await get().refreshActiveBalance()
          await get().fetchNetworkAssets()
        })()
      },

      ensureNetworkAddress: async (networkId) => {
        const { networks, accounts, activeAccountId, sessionMnemonic } = get()
        const net = networks.find(n => n.id === networkId)
        const acc = accounts.find(a => a.id === activeAccountId) || accounts[0]
        if (!net || !acc || !sessionMnemonic) return null
        const accountIndex = resolveDerivationIndex(acc, accounts.findIndex((a) => a.id === acc.id))
        const forceCanonicalUtxoAddress = net.coinType === 'UTXO' && shouldForceCanonicalUtxoAddress(net.coinSymbol)

        // Return already-stored address if present
        const existing = acc.networkAddresses?.[networkId]
        if (existing) {
          if (forceCanonicalUtxoAddress) {
            // Continue to derivation below to canonicalize persisted legacy paths.
          } else if (net.coinType === 'UTXO' && net.coinSymbol) {
            if (isAddressForCoinSymbol(existing, net.coinSymbol)) return existing
          } else {
            return existing
          }
        }

        // Derive address on demand
        try {
          let address = ''
          if (net.coinType === 'EVM') {
            address = deriveEvmWallet(sessionMnemonic, accountIndex).address
          } else if (net.coinType === 'XRP') {
            const derived = await deriveXrpAddress(sessionMnemonic, accountIndex)
            address = derived.address
          } else if (net.coinType === 'UTXO' && net.coinSymbol) {
            const derived = await deriveUtxoAddress(sessionMnemonic, net.coinSymbol, accountIndex, 0, 0)
            address = derived.address
            if (forceCanonicalUtxoAddress && existing && existing !== address) {
              console.info(`[${net.symbol}] migrated canonical address ${existing} -> ${address}`)
            } else {
              console.log(`✓ Derived ${net.symbol} address on demand: ${address}`)
            }
          }
          if (address) {
            if (existing !== address) {
              get().updateAccount(acc.id, {
                networkAddresses: { ...(acc.networkAddresses ?? {}), [networkId]: address }
              })
            }
            return address
          }
        } catch (err) {
          console.warn(`Failed to derive address for ${networkId}:`, err)
        }
        return null
      },

      setActiveNetwork: async (id) => {
        set((state) => {
          const activeAccount = state.accounts.find((account) => account.id === state.activeAccountId) || state.accounts[0]
          const nextAccounts = activeAccount
            ? state.accounts.map((account) => (
              account.id === activeAccount.id
                ? { ...account, balance: getCachedBalanceForNetwork(account, id, false) }
                : account
            ))
            : state.accounts

          return {
            activeNetworkId: id,
            lastActiveTimestamp: Date.now(),
            accounts: nextAccounts
          }
        })
        await get().ensureNetworkAddress(id)
        await get().refreshActiveBalance()
      },

      setConnected: (connected) => set({ isConnected: connected }),
      setSyncing: (syncing) => set({ isSyncing: syncing }),

      fetchNetworkAssets: async () => {
        const { networks, activeNetworkId, accounts, activeAccountId, useLocalRpc: ulr, localRpcOverrides: lro } = get()
        const net = networks.find(n => n.id === activeNetworkId)
        const acc = accounts.find(a => a.id === activeAccountId) || accounts[0]
        if (!net || !acc) return
        if (!resolveNetworkCapabilities(net).features.assetLayer) return

        const address = acc.networkAddresses?.[activeNetworkId] || ''
        if (!address) return

        const rpcConfig = await createUtxoRpcConfig(net, {
          useLocalRpc: ulr,
          localRpcOverride: lro[net.id],
          secureBridgeSigner: get().signBackendAuthMessage
        })

        try {
          const assets = await listAssetBalancesByAddress(rpcConfig, address)
          set(state => ({
            networkAssets: {
              ...state.networkAssets,
              [activeNetworkId]: assets ?? {}
            }
          }))
        } catch (err) {
          console.warn(`[${net.symbol}] fetchNetworkAssets failed:`, err)
        }
      },

      fetchAssetDetails: async (assetId) => {
        const normalizedAssetId = String(assetId || '').trim()
        if (!normalizedAssetId) throw new Error('Asset id is required')

        const { networks, activeNetworkId, useLocalRpc: ulr, localRpcOverrides: lro } = get()
        const net = networks.find((n) => n.id === activeNetworkId)
        if (!net) throw new Error('Active network not found')
        if (!resolveNetworkCapabilities(net).features.assetLayer) {
          throw new Error('Active network does not support assets')
        }

        const rpcConfig = await createUtxoRpcConfig(net, {
          useLocalRpc: ulr,
          localRpcOverride: lro[net.id],
          secureBridgeSigner: get().signBackendAuthMessage
        })
        const splitMatch = normalizedAssetId.match(/^([^|/#:]+)[|/#:]([^|/#:]+)$/)
        const rootPart = splitMatch?.[1]?.trim() || ''
        const subPart = splitMatch?.[2]?.trim() || ''

        const candidates = Array.from(new Set([
          normalizedAssetId,
          normalizedAssetId.includes('|') ? normalizedAssetId.replace('|', '/') : normalizedAssetId,
          normalizedAssetId.includes('/') ? normalizedAssetId.replace('/', '|') : normalizedAssetId,
          normalizedAssetId.includes('|') ? normalizedAssetId.replace('|', '#') : normalizedAssetId,
          normalizedAssetId.includes('/') ? normalizedAssetId.replace('/', '#') : normalizedAssetId,
          normalizedAssetId.includes('#') ? normalizedAssetId.replace('#', '/') : normalizedAssetId,
          normalizedAssetId.includes('#') ? normalizedAssetId.replace('#', '|') : normalizedAssetId,
          (rootPart && subPart) ? `${rootPart}${subPart}` : normalizedAssetId,
          normalizedAssetId.toUpperCase(),
          ((rootPart && subPart) ? `${rootPart}/${subPart}` : normalizedAssetId).toUpperCase(),
          ((rootPart && subPart) ? `${rootPart}|${subPart}` : normalizedAssetId).toUpperCase(),
          ((rootPart && subPart) ? `${rootPart}#${subPart}` : normalizedAssetId).toUpperCase(),
          ((rootPart && subPart) ? `${rootPart}${subPart}` : normalizedAssetId).toUpperCase()
        ]))

        for (const candidate of candidates) {
          try {
            const details = await getAssetDetailsByName(rpcConfig, candidate)
            if (details) return details
          } catch {
            // try next candidate
          }
        }

        throw new Error(`Asset metadata not found for "${normalizedAssetId}". Tried: ${candidates.join(', ')}`)
      },

      sendRtmAsset: async ({ assetId, qty, toAddress, changeAddress = '', assetChangeAddress = '' }) => {
        const {
          networks, activeNetworkId, isLocked, sessionMnemonic,
          accounts, activeAccountId, useLocalRpc: ulr2, localRpcOverrides: lro2
        } = get()
        if (isLocked || !sessionMnemonic) throw new Error('Wallet is locked')

        const net = networks.find(n => n.id === activeNetworkId)
        const acc = accounts.find((a) => a.id === activeAccountId) || accounts[0]
        if (!net) throw new Error('Active network not found')
        if (!acc) throw new Error('No active account')
        if (!net.coinSymbol) throw new Error('Network missing coinSymbol')
        if (!resolveNetworkCapabilities(net).features.assetSend) {
          throw new Error('Active network does not support asset transfers')
        }

        const accountIndex = resolveDerivationIndex(acc, accounts.findIndex((a) => a.id === acc.id))
        const senderAddress = acc.networkAddresses?.[activeNetworkId]
          || await get().ensureNetworkAddress(activeNetworkId)
        if (!senderAddress) throw new Error(`No address derived for ${net.name}`)

        const derived = await deriveUtxoAddress(sessionMnemonic, net.coinSymbol, accountIndex, 0, 0)

        const rpcConfig = await createUtxoRpcConfig(net, {
          useLocalRpc: ulr2,
          localRpcOverride: lro2[net.id],
          secureBridgeSigner: get().signBackendAuthMessage
        })
        const rawFeePerByteCoins = net.feePerByte ?? estimateNetworkFee(net.id, 1) ?? 0.0000002
        let feePerByteSats = Math.max(1, Math.round(Number(rawFeePerByteCoins) * 1e8))
        if (feePerByteSats > 500) feePerByteSats = Math.max(1, Math.round(feePerByteSats / 1000))

        const txid = await sendRtmAssetNonCustodial(rpcConfig, {
          fromAddress: senderAddress,
          fromPrivateKeyHex: derived.privHex,
          assetId,
          qty,
          toAddress,
          changeAddress,
          assetChangeAddress,
          feePerByteSats
        })
        await get().fetchNetworkAssets()
        return { txid }
      },

      fullRestore: async ({ backup, backupPassword, newPassword }) => {
        // 1. Verify & decrypt the backup vault with the original password.
        const plain = await decryptVaultV1({ password: backupPassword, vault: backup.vault })
        const normalizedMnemonic = plain.mnemonic.trim()

        // 2. Re-encrypt with the new password.
        const newVault = await encryptVaultV1({ password: newPassword, mnemonic: normalizedMnemonic })

        // 3. Normalize the persisted accounts so they satisfy the Account shape.
        const restoredAccounts = normalizePersistedAccounts(backup.accounts)

        // 4. Re-derive fresh network addresses for every account so they are
        //    guaranteed to match the restored mnemonic.
        const networks = get().networks
        const reHydratedAccounts: Account[] = []
        for (const acc of restoredAccounts) {
          const derived = await deriveAccountAddresses(normalizedMnemonic, networks, acc.derivationIndex)
          reHydratedAccounts.push({
            ...acc,
            addresses: {
              EVM:  derived.addresses.EVM  || acc.addresses?.EVM  || '',
              UTXO: derived.addresses.UTXO || acc.addresses?.UTXO || '',
              BTC:  acc.addresses?.BTC || '',
              SOL:  acc.addresses?.SOL || '',
              XRP:  derived.addresses.XRP || acc.addresses?.XRP || ''
            },
            networkAddresses: {
              ...(acc.networkAddresses ?? {}),
              ...derived.networkAddresses
            }
          })
        }

        const safeActiveAccountId = reHydratedAccounts.some(a => a.id === backup.activeAccountId)
          ? backup.activeAccountId
          : (reHydratedAccounts[0]?.id ?? null)

        // 5. Write everything back into the store.
        set({
          isInitialized:    true,
          hasVault:         true,
          isLocked:         false,
          vault:            newVault,
          backupConfirmed:  backup.backupConfirmed ?? true,
          createdAt:        backup.createdAt ?? Date.now(),
          sessionMnemonic:  normalizedMnemonic,
          accounts:         reHydratedAccounts,
          nextAccountIndex: backup.nextAccountIndex ?? reHydratedAccounts.length,
          activeAccountId:  safeActiveAccountId,
          activeNetworkId:  backup.activeNetworkId ?? get().activeNetworkId,
          activity:         Array.isArray(backup.activity) ? backup.activity : [],
          authorizedSites:  Array.isArray(backup.authorizedSites) ? backup.authorizedSites : [],
          autolockMinutes:  typeof backup.autolockMinutes === 'number' ? backup.autolockMinutes : 5,
          networkAssets:    backup.networkAssets ?? {},
          lastActiveTimestamp: Date.now()
        })
      },

      addAuthorizedSite: (origin) => set((state) => {
        const normalizedOrigin = normalizeDappOrigin(origin)
        if (!normalizedOrigin || normalizedOrigin === 'unknown') return state
        if (state.authorizedSites.includes(normalizedOrigin)) return state
        return { authorizedSites: [...state.authorizedSites, normalizedOrigin] }
      }),
      
      removeAuthorizedSite: (origin) => set((state) => {
        const normalizedOrigin = normalizeDappOrigin(origin)
        return {
          authorizedSites: state.authorizedSites.filter((site) => site !== normalizedOrigin && site !== origin)
        }
      }),

      setAutolock: (minutes) => set({ autolockMinutes: minutes }),
      
      updateLastActive: () => set({ lastActiveTimestamp: Date.now() }),
      
      checkAutolock: () => {
        const { lastActiveTimestamp, autolockMinutes, isLocked, isInitialized } = get()
        if (!isInitialized || isLocked) return

        const now = Date.now()
        if (now - lastActiveTimestamp > autolockMinutes * 60 * 1000) {
          set({ isLocked: true })
        }
      },

      addActivity: (item) => set((state) => {
        const resolvedAccountId = String(
          item.accountId
          || state.activeAccountId
          || state.accounts[0]?.id
          || ''
        ).trim()

        return {
          activity: [
            { ...item, accountId: resolvedAccountId || undefined },
            ...state.activity
          ]
        }
      }),

      changePassword: (oldPass, newPass) => {
        // Legacy stub: now we store an encrypted vault, so password change requires re-encrypt.
        // Keep return false for now; will be upgraded once vault wiring is complete.
        return false
      },

      addAccount: async (name, networkId) => {
        const { accounts, networks, activeNetworkId, sessionMnemonic, isLocked, nextAccountIndex } = get()
        if (isLocked || !sessionMnemonic) throw new Error('Unlock wallet first to create an account')
        const normalizedName = name.trim()
        if (!normalizedName) throw new Error('Account name is required')
        const selectedNetworkId = networkId || activeNetworkId
        const selectedNetwork = networks.find((n) => n.id === selectedNetworkId)
        if (!selectedNetwork) throw new Error(`Selected network not found: ${selectedNetworkId}`)

        const derivationIndex = nextAccountIndex >= 0 ? nextAccountIndex : accounts.length
        let selectedAddress = ''

        if (selectedNetwork.coinType === 'EVM') {
          selectedAddress = deriveEvmWallet(sessionMnemonic, derivationIndex).address
        } else if (selectedNetwork.coinType === 'XRP') {
          const derived = await deriveXrpAddress(sessionMnemonic, derivationIndex)
          selectedAddress = derived.address
        } else if (selectedNetwork.coinType === 'UTXO' && selectedNetwork.coinSymbol) {
          const derived = await deriveUtxoAddress(sessionMnemonic, selectedNetwork.coinSymbol, derivationIndex, 0, 0)
          selectedAddress = derived.address
        }

        if (!selectedAddress) {
          throw new Error(`Could not derive ${selectedNetwork.symbol} address for account ${normalizedName}`)
        }

        const addresses: Record<CoinType, string> = { EVM: '', UTXO: '', BTC: '', SOL: '', XRP: '' }
        if (selectedNetwork.coinType === 'EVM') addresses.EVM = selectedAddress
        if (selectedNetwork.coinType === 'UTXO') addresses.UTXO = selectedAddress
        if (selectedNetwork.coinType === 'XRP') addresses.XRP = selectedAddress

        const newAccount: Account = {
          id: `acc-${Date.now()}`,
          name: normalizedName,
          derivationIndex,
          addresses,
          networkAddresses: { [selectedNetwork.id]: selectedAddress },
          networkBalances: { [selectedNetwork.id]: '0' },
          balance: '0'
        }
        set({
          accounts: [...accounts, newAccount],
          activeAccountId: newAccount.id,
          nextAccountIndex: derivationIndex + 1,
          lastActiveTimestamp: Date.now()
        })
        await get().refreshActiveBalance()
      },

      removeAccount: (id) => {
        const { accounts, activeAccountId } = get()
        if (accounts.length <= 1) return // Don't allow removing the last account
        const filtered = accounts.filter(a => a.id !== id)
        const newActiveId = activeAccountId === id 
          ? (filtered[0]?.id || null)
          : activeAccountId
        set({ 
          accounts: filtered,
          activeAccountId: newActiveId
        })
      },

      updateAccount: (id, updates) => {
        set((state) => ({
          accounts: state.accounts.map(acc => 
            acc.id === id ? { ...acc, ...updates } : acc
          )
        }))
      },

      addNetwork: (network) => {
        set((state) => ({
          networks: [...state.networks, network]
        }))
      },

      removeNetwork: (id) => {
        const { networks, activeNetworkId } = get()
        if (networks.length <= 1) return // Don't allow removing the last network
        const filtered = networks.filter(n => n.id !== id)
        const newActiveId = activeNetworkId === id 
          ? (filtered[0]?.id || DEFAULT_NETWORK_ID)
          : activeNetworkId
        set({
          networks: filtered,
          activeNetworkId: newActiveId
        })
      },

      updateNetwork: (id, updates) => {
        set((state) => ({
          networks: state.networks.map(net => 
            net.id === id ? { ...net, ...updates } : net
          )
        }))
      },

      setUseLocalRpc: (enabled) => set({ useLocalRpc: enabled }),

      setLocalRpcOverride: (networkId, override) =>
        set((state) => ({
          localRpcOverrides: { ...state.localRpcOverrides, [networkId]: override }
        })),

      refreshActiveBalance: async (options) => {
        const fastMode = options?.fast === true
        const skipZeroBalanceRecheck = options?.skipZeroBalanceRecheck === true
        const { networks, activeNetworkId, accounts, activeAccountId } = get()
        const net = networks.find((n) => n.id === activeNetworkId)
        const acc = accounts.find((a) => a.id === activeAccountId) || accounts[0]
        if (!net || !acc) return
        const requestStartedAt = Date.now()
        const requestNonce = get().balanceRefreshNonce + 1
        const isStaleRequest = () => {
          const state = get()
          if (state.balanceRefreshNonce !== requestNonce) return true
          if (state.activeNetworkId !== activeNetworkId) return true
          if (state.activeAccountId !== acc.id) return true
          return false
        }
        const waitForUiStabilize = async () => {
          if (fastMode) return
          const elapsed = Date.now() - requestStartedAt
          await delay(Math.max(0, BALANCE_UI_STABILIZE_MS - elapsed))
        }
        set((state) => ({ balanceRefreshNonce: requestNonce, isSyncing: true, accounts: state.accounts }))

        // ── Resolve the correct per-network address ──────────────────────────
        // NEVER fall back to acc.addresses.UTXO — that slot holds the FIRST UTXO
        // network's address (RTM) and would show a wrong address on other coins.
        let address: string | null = acc.networkAddresses?.[activeNetworkId] ?? null
        if (address && net.coinType === 'UTXO' && net.coinSymbol && !isAddressForCoinSymbol(address, net.coinSymbol)) {
          address = null
        }
        if (!address && net.coinType === 'EVM') address = acc.addresses?.EVM ?? null
        if (!address || net.coinType === 'UTXO') {
          const ensured = await get().ensureNetworkAddress(activeNetworkId)
          if (ensured) address = ensured
        }

        if (!address) {
          console.warn(`No address for ${activeNetworkId} — skipping balance refresh`)
          await waitForUiStabilize()
          if (isStaleRequest()) return
          set({ isSyncing: false, isConnected: false, syncPercent: null, lowSyncStreak: 0 })
          return
        }

        try {
          if (net.coinType === 'EVM') {
            const provider = new ethers.JsonRpcProvider(net.rpcUrl, net.chainId)
            const bal = await provider.getBalance(address)
            await waitForUiStabilize()
            if (isStaleRequest()) return
            set((state) => ({
              isSyncing: false,
              isConnected: true,
              syncPercent: 100,
              lowSyncStreak: 0,
              accounts: state.accounts.map((a) =>
                a.id === acc.id
                  ? {
                      ...a,
                      balance: ethers.formatEther(bal),
                      networkBalances: {
                        ...(a.networkBalances ?? {}),
                        [activeNetworkId]: ethers.formatEther(bal)
                      }
                    }
                  : a
              )
            }))
        } else if (net.coinType === 'XRP') {
          const { useLocalRpc, localRpcOverrides } = get()
          const rpcConfig = await createUtxoRpcConfig(net, {
            useLocalRpc,
            localRpcOverride: localRpcOverrides[net.id],
            secureBridgeSigner: get().signBackendAuthMessage
          })
          const balance = await getXrpAccountBalance(rpcConfig, address)
          await waitForUiStabilize()
          if (isStaleRequest()) return
          set((state) => ({
            isSyncing: false,
            isConnected: true,
            syncPercent: 100,
            lowSyncStreak: 0,
            accounts: state.accounts.map((a) =>
              a.id === acc.id
                ? {
                    ...a,
                    balance: balance.balance,
                    networkBalances: {
                      ...(a.networkBalances ?? {}),
                      [activeNetworkId]: balance.balance
                    }
                  }
                : a
            )
          }))
        } else if (net.coinType === 'UTXO') {
        const { useLocalRpc, localRpcOverrides } = get()
        const rpcConfig = await createUtxoRpcConfig(net, {
          useLocalRpc,
          localRpcOverride: localRpcOverrides[net.id],
          secureBridgeSigner: get().signBackendAuthMessage
        })
        let syncPercent: number | null = null
        let isChainSyncing = false
        const isBtczBridgeMode =
          String(net.coinSymbol || '').trim().toUpperCase() === 'BTCZ' && !useLocalRpc

        // BTCZ bridge deployments are frequently missing a healthy chain RPC backend
        // even when explorer data can still provide balances. Skip noisy chain probe.
        if (!isBtczBridgeMode) {
          try {
            const chainInfo = await getBlockchainInfo(rpcConfig)
            const vpRaw = Number(chainInfo.verificationprogress)
            const fallbackFromBlocks =
              Number(chainInfo.headers) > 0
                ? (Number(chainInfo.blocks) / Number(chainInfo.headers))
                : NaN
            const progress01 = Number.isFinite(vpRaw) && vpRaw > 0 ? vpRaw : fallbackFromBlocks
            if (Number.isFinite(progress01) && progress01 >= 0) {
              syncPercent = Math.max(0, Math.min(100, progress01 * 100))
            }
            if (typeof chainInfo.initialblockdownload === 'boolean') {
              isChainSyncing = chainInfo.initialblockdownload
            } else if (syncPercent !== null) {
              isChainSyncing = syncPercent < MIN_SYNC_PERCENT_FOR_SEND
            }
          } catch (err) {
            console.warn(`[${net.symbol}] getblockchaininfo failed:`, err)
          }
        }

            const balanceOptions = {
              // RTM/BTCZ/TIDE support non-wallet address balance via address-index
              // or configured explorer fallback (BTCZ).
              preferAddressIndex: supportsAddressIndexBalance(net.coinSymbol)
            }
            let balance = await getUtxoBalance(rpcConfig, address, balanceOptions)
            if (balance.total <= 0 && !skipZeroBalanceRecheck && !fastMode) {
              await delay(UTXO_ZERO_BALANCE_RECHECK_MS)
              if (isStaleRequest()) return
              try {
                const secondRead = await getUtxoBalance(rpcConfig, address, balanceOptions)
                if (secondRead.total > balance.total) balance = secondRead
              } catch {
                // Keep initial read when recheck fails.
              }
            }
            console.info(`[${net.symbol}] connected via bridge`)

            await waitForUiStabilize()
            if (isStaleRequest()) return
            set((state) => ({
              lowSyncStreak: (() => {
                const syncPercentIsLow = typeof syncPercent === 'number' && Number.isFinite(syncPercent) && syncPercent < MIN_SYNC_PERCENT_FOR_SEND
                const lowSyncCheck = isChainSyncing || syncPercentIsLow
                return lowSyncCheck ? Math.min(50, (state.lowSyncStreak || 0) + 1) : 0
              })(),
              isSyncing: isChainSyncing,
              isConnected: true,
              syncPercent,
              accounts: state.accounts.map((a) =>
                a.id === acc.id
                  ? {
                      ...a,
                      balance: String(balance.total),
                      networkBalances: {
                        ...(a.networkBalances ?? {}),
                        [activeNetworkId]: String(balance.total)
                      }
                    }
                  : a
              )
            }))
          }
        } catch (err) {
          const transientBridgeFailure = isTransientBridgeFailure(err)
          if (transientBridgeFailure) {
            console.warn(`[${net?.symbol}] transient bridge failure; preserving previous connection state`, err)
            useApiMonitorStore.getState().clearLastError()
            await waitForUiStabilize()
            if (isStaleRequest()) return
            set((state) => ({
              isSyncing: false,
              isConnected: state.isConnected,
              syncPercent: state.syncPercent,
              lowSyncStreak: state.lowSyncStreak,
              accounts: state.accounts
            }))
            return
          }

          // Non-transient failure → mark disconnected.
          console.error(`[${net?.symbol}] all RPC attempts failed:`, err)
          await waitForUiStabilize()
          if (isStaleRequest()) return
          set({ isSyncing: false, isConnected: false, lowSyncStreak: 0 })
        }
      },

      sendEvmTransaction: async ({ to, amount }) => {
        const { networks, activeNetworkId, accounts, activeAccountId, sessionMnemonic, isLocked } = get()
        if (isLocked || !sessionMnemonic) throw new Error('Wallet is locked')

        const net = networks.find((n) => n.id === activeNetworkId)
        const acc = accounts.find((a) => a.id === activeAccountId) || accounts[0]
        if (!net || net.coinType !== 'EVM') throw new Error('Active network is not EVM')
        if (!acc?.addresses?.EVM) throw new Error('No active account')
        const accountIndex = resolveDerivationIndex(acc, accounts.findIndex((a) => a.id === acc.id))

        const provider = new ethers.JsonRpcProvider(net.rpcUrl, net.chainId)
        const wallet = deriveEvmWallet(sessionMnemonic, accountIndex).connect(provider)

        const tx = await wallet.sendTransaction({
          to: to.trim(),
          value: ethers.parseEther(String(amount))
        })

        return { hash: tx.hash }
      },

      sendXrpTransaction: async ({ to, amount }) => {
        const { networks, activeNetworkId, isLocked, useLocalRpc: ulrXrp, localRpcOverrides: lroXrp } = get()
        if (isLocked) throw new Error('Wallet is locked')

        const net = networks.find((n) => n.id === activeNetworkId)
        if (!net || net.coinType !== 'XRP') throw new Error('Active network is not XRP')

        const rpcConfig = await createUtxoRpcConfig(net, {
          useLocalRpc: ulrXrp,
          localRpcOverride: lroXrp[net.id],
          secureBridgeSigner: get().signBackendAuthMessage
        })

        const toAddress = String(to || '').trim()
        const amountValue = Number(amount)
        if (!toAddress) throw new Error('Recipient address is required')
        if (!Number.isFinite(amountValue) || amountValue <= 0) throw new Error('Amount must be greater than 0')

        const recipientValidation = await validateAddress(rpcConfig, toAddress)
        if (!recipientValidation?.isvalid) {
          throw new Error(`Recipient address is invalid for XRP: ${toAddress}`)
        }

        const txid = await sendToAddress(rpcConfig, toAddress, Number(amountValue.toFixed(6)))
        return { hash: txid }
      },

      sendUtxoTransaction: async ({ to, amount, donation }) => {
        const { networks, activeNetworkId, accounts, activeAccountId, sessionMnemonic, isLocked, useLocalRpc: ulr3, localRpcOverrides: lro3 } = get()
        if (isLocked || !sessionMnemonic) throw new Error('Wallet is locked')

        const net = networks.find((n) => n.id === activeNetworkId)
        const acc = accounts.find((a) => a.id === activeAccountId) || accounts[0]
        if (!net || net.coinType !== 'UTXO') throw new Error('Active network is not UTXO')
        if (!net.coinSymbol) throw new Error('Network missing coinSymbol')
        const accountIndex = resolveDerivationIndex(acc, accounts.findIndex((a) => a.id === acc.id))

        // Always use the network-specific address, not the generic UTXO slot
        const senderAddress = acc?.networkAddresses?.[activeNetworkId]
          || await get().ensureNetworkAddress(activeNetworkId)
        if (!senderAddress) throw new Error(`No address derived for ${net.name}`)

        const rpcConfig = await createUtxoRpcConfig(net, {
          useLocalRpc: ulr3,
          localRpcOverride: lro3[net.id],
          secureBridgeSigner: get().signBackendAuthMessage
        })
        const validation = await validateAddress(rpcConfig, senderAddress)
        if (!validation?.isvalid) {
          throw new Error(`Active sender address is invalid for ${net.symbol}: ${senderAddress}`)
        }

        // ── Fetch confirmed UTXOs — three-tier strategy ───────────────────
        // Tier 1 (RTM/BTCZ/TIDE/FIRO): getaddressutxos — uses address index, works for
        //   any HD-derived address without wallet import when supported.
        // Tier 2: listunspent — wallet-scoped, works if address is in the wallet.
        // Tier 3: scantxoutset — full chainstate scan (slow ~45 s), last resort.
        let unspent: Awaited<ReturnType<typeof listUtxoUnspent>> = []

        if (supportsAddressIndex(net.coinSymbol)) {
          try {
            const byIndex = await getAddressUtxos(rpcConfig, senderAddress, 1)
            if (byIndex.length > 0) unspent = byIndex
          } catch {
            // address index not available — fall through
          }
        }

        if (unspent.length === 0) {
          try {
            const byWallet = await listUtxoUnspent(rpcConfig, senderAddress, 1)
            if (byWallet.length > 0) unspent = byWallet
          } catch {
            // wallet doesn't hold address — fall through
          }
        }

        if (unspent.length === 0) {
          const scanned = await scanAddressUnspent(rpcConfig, senderAddress)
          if (scanned.length > 0) unspent = scanned
        }

        // Address-index UTXO methods read chainstate and can be stale vs mempool.
        // Exclude outpoints already spent by unconfirmed mempool transactions.
        if (unspent.length > 0 && supportsAddressIndex(net.coinSymbol)) {
          try {
            const mempoolSpent = await getAddressMempoolSpentOutpoints(rpcConfig, senderAddress)
            if (mempoolSpent.size > 0) {
              unspent = unspent.filter((utxo) => !mempoolSpent.has(`${utxo.txid}:${utxo.vout}`))
            }
          } catch {
            // getaddressmempool may be unavailable on some nodes; ignore
          }
        }

        // Defensive filter: bridge/index responses can occasionally include
        // non-sender rows. Never sign foreign-address inputs with this key.
        if (unspent.length > 0) {
          const normalizedSender = String(senderAddress).trim()
          const before = unspent.length
          unspent = unspent.filter((utxo) => String(utxo.address || normalizedSender).trim() === normalizedSender)
          if (unspent.length !== before) {
            console.warn(`[${net.symbol}] filtered ${before - unspent.length} non-sender UTXOs before signing`)
          }
        }

        if (unspent.length === 0) {
          const balanceHint = await getUtxoBalance(rpcConfig, senderAddress, {
            preferAddressIndex: supportsAddressIndex(net.coinSymbol)
          }).catch(() => null)
          if (balanceHint && balanceHint.total > 0 && balanceHint.confirmed <= 0) {
            throw new Error(`Funds are present but not yet spendable (unconfirmed). Confirmed: ${balanceHint.confirmed}, total: ${balanceHint.total}`)
          }
          if (balanceHint && balanceHint.total > 0) {
            throw new Error('Detected pending unconfirmed spend from this address (mempool conflict). Wait for confirmation, then retry.')
          }
          throw new Error(`No confirmed spendable UTXOs found for address ${senderAddress}`)
        }

        const amountToSend = parseFloat(String(amount))
        const sat = (coins: number): number => Math.round(Number(coins) * 1e8)
        const coins8 = (sats: number): number => Number((sats / 1e8).toFixed(8))
        const donationAddress = String(donation?.address || '').trim()
        const donationAmountCoins = Number(donation?.amount ?? 0)
        const donationAmountSats = Number.isFinite(donationAmountCoins) && donationAmountCoins > 0
          ? sat(donationAmountCoins)
          : 0
        if (donation?.required && donationAmountSats <= 0) {
          throw new Error('Donation is required by bridge policy')
        }
        if ((donationAmountSats > 0 || donation?.required) && !donationAddress) {
          throw new Error('Donation address is missing from bridge policy')
        }
        if (donationAmountSats > 0) {
          const donationValidation = await validateAddress(rpcConfig, donationAddress)
          if (!donationValidation?.isvalid) {
            throw new Error(`Donation address is invalid for ${net.symbol}: ${donationAddress}`)
          }
        }

        // ── Greedy UTXO selection with size-based fee estimate ────────────────
        // P2PKH sizes: 10 base + 148/input + 34/output (send + change = 2 outputs)
        const rawFeePerByteCoins = net.feePerByte ?? estimateNetworkFee(net.id, 1) ?? 0.0000002
        let feePerByteSats = Math.max(1, sat(rawFeePerByteCoins))
        // If configured fee looks absurdly high for "per byte", treat it as "per kB".
        if (feePerByteSats > 500) feePerByteSats = Math.max(1, Math.round(feePerByteSats / 1000))
        const OVERHEAD_BYTES = 10
        const INPUT_BYTES = 148
        const OUTPUT_BYTES = 34
        const MAX_REASONABLE_FEE_SATS = 10_000_000 // mirrors node absurd-fee guard
        const DUST_THRESHOLD_SATS = 1_000
        const amountToSendSats = sat(amountToSend)
        const outputsWithoutChange = 1 + (donationAmountSats > 0 ? 1 : 0)

        // Sort descending by amount for efficient greedy selection
        const sorted = [...unspent].sort((a, b) => b.amount - a.amount)
        const selectedUtxos: typeof unspent = []
        let accumulatedSats = 0

        for (const utxo of sorted) {
          selectedUtxos.push(utxo)
          accumulatedSats += sat(utxo.amount)
          const txBytes = OVERHEAD_BYTES + INPUT_BYTES * selectedUtxos.length + OUTPUT_BYTES * (outputsWithoutChange + 1)
          const estimatedFeeSats = txBytes * feePerByteSats
          if (accumulatedSats >= amountToSendSats + donationAmountSats + estimatedFeeSats) break
          if (selectedUtxos.length >= 25) break // safety cap
        }

        const txBytes = OVERHEAD_BYTES + INPUT_BYTES * selectedUtxos.length + OUTPUT_BYTES * (outputsWithoutChange + 1)
        const estimatedFeeSats = txBytes * feePerByteSats
        const totalAvailableSats = selectedUtxos.reduce((sum, utxo) => sum + sat(utxo.amount), 0)

        if (estimatedFeeSats > MAX_REASONABLE_FEE_SATS) {
          throw new Error(`Estimated fee too high: ${coins8(estimatedFeeSats)} ${net.coinSymbol}. Check fee settings / UTXO fragmentation.`)
        }

        if (amountToSendSats + donationAmountSats + estimatedFeeSats > totalAvailableSats) {
          throw new Error(
            `Insufficient balance: need ${coins8(amountToSendSats + donationAmountSats + estimatedFeeSats).toFixed(8)}, have ${coins8(totalAvailableSats).toFixed(8)}`
          )
        }

        const changeAmountSats = totalAvailableSats - amountToSendSats - donationAmountSats - estimatedFeeSats

        // Derive private key for signing
        const derived = await deriveSigningKeyForSenderAddress(
          sessionMnemonic,
          net,
          accountIndex,
          senderAddress
        )

        // Create transaction inputs (for createrawtransaction)
        const inputs = selectedUtxos.map(utxo => ({
          txid: utxo.txid,
          vout: utxo.vout
        }))

        // Create transaction outputs
        const toAddress = to.trim()
        const outputsSats: Record<string, number> = {}
        const addOutputSats = (address: string, satsValue: number) => {
          if (!address || satsValue <= 0) return
          outputsSats[address] = (outputsSats[address] || 0) + satsValue
        }
        addOutputSats(toAddress, amountToSendSats)
        addOutputSats(donationAddress, donationAmountSats)

        // Add change output if needed
        if (changeAmountSats > DUST_THRESHOLD_SATS) {
          addOutputSats(senderAddress, changeAmountSats)
        }
        const outputs = Object.fromEntries(
          Object.entries(outputsSats).map(([address, satsValue]) => [address, coins8(satsValue)])
        )

        const isBtcz = String(net.coinSymbol || '').trim().toUpperCase() === 'BTCZ'
        let btczBranchId: number | undefined
        if (isBtcz) {
          try {
            const chainInfo = await getBlockchainInfo(rpcConfig)
            const branchRaw = String(
              (chainInfo as any)?.consensus?.chaintip
              ?? (chainInfo as any)?.consensus?.nextblock
              ?? ''
            ).trim()
            if (/^[0-9a-fA-F]{8}$/.test(branchRaw)) {
              btczBranchId = Number.parseInt(branchRaw, 16) >>> 0
            }
          } catch (err) {
            console.warn(`[${net.symbol}] could not resolve consensus branch id, using BTCZ Sapling default`, err)
          }
        }

        // Create raw transaction
        const rawHex = await createRawTransaction(rpcConfig, inputs, outputs)

        // Prepare inputs for signing (with scriptPubKey and amount in sats)
        const signingInputs: UnsignedTxInput[] = selectedUtxos.map(utxo => ({
          txid: utxo.txid,
          vout: utxo.vout,
          scriptPubKeyHex: utxo.scriptPubKey,
          amountSats: sat(utxo.amount)
        }))

        let signedHex = ''
        try {
          // Strict non-custodial policy: sign only client-side.
          signedHex = isBtcz
            ? await signBtczTransparentTransaction(rawHex, signingInputs, derived.privHex, { consensusBranchId: btczBranchId })
            : await signLegacyP2pkhTransaction(rawHex, signingInputs, derived.privHex)
        } catch (signErr) {
          if (isBtcz && isClientSignerFormatError(signErr)) {
            throw new Error(
              'BTCZ client-side signing failed while parsing transaction format. ' +
              'Only transparent Overwinter/Sapling transactions are supported.'
            )
          }
          throw signErr
        }

        // Broadcast transaction
        let txid = ''
        try {
          txid = await sendRawTransaction(rpcConfig, signedHex)
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          if (/txn-mempool-conflict|\(code\s*18\)|code\s*18/i.test(message)) {
            throw new Error('Transaction conflicts with a pending mempool transaction from this wallet. Wait for at least 1 confirmation and try again.')
          }
          throw error
        }
        return { hash: txid }
      }
    }),
    {
      name: WALLET_STORAGE_KEY,
      storage: createJSONStorage(() => extensionStateStorage),
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
        activeNetworkId: state.activeNetworkId,
        networks: state.networks,
        isConnected: state.isConnected,
        isSyncing: state.isSyncing,
        syncPercent: state.syncPercent,
        authorizedSites: state.authorizedSites,
        autolockMinutes: state.autolockMinutes,
        lastActiveTimestamp: state.lastActiveTimestamp,
        activity: state.activity
      }),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<WalletState>
        const merged = { ...currentState, ...persisted } as WalletState
        const accounts = normalizePersistedAccounts(persisted.accounts ?? merged.accounts)
        const highestDerivationIndex = accounts.reduce((max, account) => Math.max(max, account.derivationIndex), -1)
        const nextAccountIndex = Math.max(
          1,
          typeof persisted.nextAccountIndex === 'number'
            ? persisted.nextAccountIndex
            : highestDerivationIndex + 1
        )
        const activeAccountId = accounts.some((a) => a.id === merged.activeAccountId)
          ? merged.activeAccountId
          : (accounts[0]?.id ?? null)
        const activeNetworkId = INITIAL_NETWORKS.some((n) => n.id === merged.activeNetworkId)
          ? merged.activeNetworkId
          : DEFAULT_ACTIVE_NETWORK_ID
        const accountsWithActiveNetworkBalance = accounts.map((account) => (
          account.id === activeAccountId
            ? { ...account, balance: getCachedBalanceForNetwork(account, activeNetworkId, true) }
            : account
        ))

        return {
          ...merged,
          accounts: accountsWithActiveNetworkBalance,
          nextAccountIndex,
          activeAccountId,
          networks: INITIAL_NETWORKS,
          activeNetworkId
        }
      }
    }
  )
)
