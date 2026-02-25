import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import { ethers } from 'ethers'
import { decryptVaultV1, encryptVaultV1, type EncryptedVaultV1 } from '../lib/vaultCrypto'
import { normalizeDappOrigin } from '../lib/dappPermissions'
import { WALLET_STORAGE_KEY } from '../lib/walletStorage'
import {
  listAssetBalancesByAddress,
  sendRtmAssetNonCustodial,
  getAssetDetailsByName,
  type RtmAssetDetails,
  type UtxoRpcConfig
} from '../lib/utxoRpc'
import { resolveBridgeTxKeyCandidates } from '../lib/bridgeAuth'
import { deriveUtxoAddress, deriveUtxoAddressWithSpec, isAddressForCoinSymbol } from '../lib/utxoAddress'
import { deriveXrpAddress } from '../lib/xrpAddress'
import { sendXrpNonCustodial } from '../lib/xrpNonCustodial'
import { deriveCardanoAddress } from '../lib/cardanoAddress'
import { sendCardanoNonCustodial } from '../lib/cardanoNonCustodial'
import { deriveMoneroAddress } from '../lib/moneroAddress'
import { sendMoneroNonCustodial } from '../lib/moneroNonCustodial'
import { MIN_SYNC_PERCENT_FOR_SEND } from '../lib/sendSyncPolicy'
import { resolveNetworkCapabilities } from '../lib/networkCapabilities'
import { validateWatchOnlyAddress } from '../lib/watchOnlyAddress'
import {
  fetchChainBalanceAndSync,
  resolveChainSendCustodyMode,
  sendChainTransaction,
  sendUtxoNonCustodialTransaction,
  validateChainAddress
} from '../lib/chainRpcAdapter'
import {
  DEFAULT_ACTIVE_NETWORK_ID,
  DEFAULT_NETWORK_ID,
  getCoinRuntimeProfile,
  INITIAL_NETWORKS,
  estimateNetworkFee
} from '../coins'
import { getCoinApiInterceptor } from '../coins/interceptors'
import type { CoinType, Network } from '../coins'
import { useApiMonitorStore } from './apiMonitorStore'

export type { CoinType, Network } from '../coins'

// â”€â”€ Full backup format â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  donationPercent: number
  backupConfirmed: boolean
  networkAssets: Record<string, Record<string, number>>
}

export interface Account {
  id: string
  name: string
  /** Per-network account labels, keyed by network id. */
  networkNames: Record<string, string>
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

export interface ChainModelLiveSnapshot {
  networkId: string
  symbol: string
  protocol: string
  backendMode: 'evm-rpc' | 'bridge' | 'local-rpc'
  address: string
  addressValid: boolean
  balance: string
  syncPercent: number | null
  isSyncing: boolean
  isConnected: boolean
  nonCustodialCompliant: boolean
  sendCustodyMode: 'non-custodial' | 'custodial-server' | 'unsupported'
  serverMatched: boolean
  checkedAt: number
  error?: string
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
  donationPercent: number
  lastActiveTimestamp: number
  activity: Activity[]

  // Local RPC mode â€” bypasses the MetaYoshi bridge when enabled
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
  setDonationPercent: (percent: number) => void
  updateLastActive: () => void
  checkAutolock: () => void
  
  addActivity: (item: Activity) => void
  changePassword: (oldPass: string, newPass: string) => boolean
  
  // Account management
  addAccount: (name: string, networkId?: string) => Promise<void>
  removeAccount: (id: string) => void
  updateAccount: (id: string, updates: Partial<Account>) => void
  setNetworkAccountName: (accountId: string, networkId: string, name: string) => void
  setWatchOnlyAddress: (accountId: string, networkId: string, address: string) => void
  
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
  probeActiveChainModel: () => Promise<ChainModelLiveSnapshot>
  sendEvmTransaction: (params: { to: string; amount: string }) => Promise<{ hash: string }>
  sendXrpTransaction: (params: { to: string; amount: string }) => Promise<{ hash: string }>
  sendCardanoTransaction: (params: { to: string; amount: string }) => Promise<{ hash: string }>
  sendMoneroTransaction: (params: { to: string; amount: string }) => Promise<{ hash: string }>
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
const MIN_DONATION_PERCENT = 0.5
const MAX_DONATION_PERCENT = 5

function clampDonationPercent(value: number): number {
  if (!Number.isFinite(value)) return MIN_DONATION_PERCENT
  return Math.max(MIN_DONATION_PERCENT, Math.min(MAX_DONATION_PERCENT, Number(value.toFixed(1))))
}

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
    // Local RPC fields â€” use user override if set, otherwise fall back to network defaults
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

const EVM_ERC20_MIN_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)'
]

type EvmTrackedToken = {
  address: string
  symbol: string
  decimals: number
}

const DEFAULT_ETH_TRACKED_TOKENS: EvmTrackedToken[] = [
  { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: 6 },
  { address: '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', symbol: 'USDC', decimals: 6 },
  { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI', decimals: 18 },
  { address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', symbol: 'SHIB', decimals: 18 }
]

function parseTrackedEvmTokens(raw: string): EvmTrackedToken[] {
  const entries = String(raw || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)

  const parsed: EvmTrackedToken[] = []
  const seen = new Set<string>()

  for (const entry of entries) {
    const [addressRaw, symbolRaw = '', decimalsRaw = '18'] = entry.split(':').map((part) => part.trim())
    if (!ethers.isAddress(addressRaw)) continue
    const checksum = ethers.getAddress(addressRaw)
    if (seen.has(checksum)) continue
    const symbol = symbolRaw || checksum.slice(0, 6)
    const decimals = Number(decimalsRaw)
    parsed.push({
      address: checksum,
      symbol: symbol.toUpperCase(),
      decimals: Number.isInteger(decimals) && decimals >= 0 && decimals <= 30 ? decimals : 18
    })
    seen.add(checksum)
  }

  return parsed
}

function resolveTrackedEvmTokens(networkId: string): EvmTrackedToken[] {
  const byNetwork = parseTrackedEvmTokens(String((import.meta as any)?.env?.[`VITE_${String(networkId || '').toUpperCase()}_TRACKED_TOKENS`] || ''))
  if (byNetwork.length > 0) return byNetwork
  if (String(networkId || '').trim().toLowerCase() === 'eth') return DEFAULT_ETH_TRACKED_TOKENS
  return []
}

function toAssetDisplaySats(balanceRaw: bigint, decimals: number): number {
  const denom = 10n ** BigInt(Math.max(0, decimals))
  const scaled = (balanceRaw * 100000000n) / denom
  return Number(scaled)
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
    if (net.derivation?.status === 'unsupported') {
      const reason = net.derivation.reason || `${net.name} derivation is not supported in this build`
      derivationErrors.push(`${net.symbol}: ${reason}`)
      continue
    }

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
    } else if (net.id === 'ada') {
      try {
        const ada = await deriveCardanoAddress(mnemonic, derivationIndex, net.rpcUrl)
        networkAddresses[net.id] = ada.address
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        derivationErrors.push(`${net.symbol}: ${msg}`)
        console.warn(`Failed to derive ${net.symbol} address (account ${derivationIndex}):`, err)
      }
    } else if (net.id === 'xmr') {
      try {
        const xmr = await deriveMoneroAddress(mnemonic, derivationIndex, net.rpcUrl)
        networkAddresses[net.id] = xmr.address
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        derivationErrors.push(`${net.symbol}: ${msg}`)
        console.warn(`Failed to derive ${net.symbol} address (account ${derivationIndex}):`, err)
      }
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
    const networkNames = candidate.networkNames ?? {}
    const networkBalances = candidate.networkBalances ?? {}

    return {
      id: typeof candidate.id === 'string' ? candidate.id : `acc-${index + 1}`,
      name: typeof candidate.name === 'string' ? candidate.name : `Account ${index + 1}`,
      networkNames: { ...networkNames },
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
      donationPercent: MIN_DONATION_PERCENT,
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
          networkNames: {},
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
          const existingAccounts = get().accounts
          const sourceAccounts: Account[] = existingAccounts.length > 0
            ? existingAccounts
            : [{
              id: 'acc-1',
              name: 'Account 1',
              networkNames: {},
              derivationIndex: 0,
              addresses: { EVM: '', UTXO: '', BTC: '', SOL: '', XRP: '' },
              networkAddresses: {},
              networkBalances: {},
              balance: '0'
            }]

          // Fast unlock path: restore persisted account state immediately.
          // Missing per-network addresses are derived lazily via ensureNetworkAddress()
          // when user switches coins/accounts or connecting screen runs.
          const nextAccounts: Account[] = sourceAccounts.map((account, i) => {
            const derivationIndex = resolveDerivationIndex(account, i)
            return {
              ...account,
              derivationIndex,
              addresses: {
                EVM: account.addresses?.EVM || '',
                UTXO: account.addresses?.UTXO || '',
                BTC: account.addresses?.BTC || '',
                SOL: account.addresses?.SOL || '',
                XRP: account.addresses?.XRP || ''
              },
              networkNames: { ...(account.networkNames ?? {}) },
              networkAddresses: { ...(account.networkAddresses ?? {}) },
              networkBalances: { ...(account.networkBalances ?? {}) },
              balance: String(account.balance ?? '0')
            }
          })

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
          donationPercent: MIN_DONATION_PERCENT,
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
        if (!net || !acc) return null
        const existing = acc.networkAddresses?.[networkId]
        if (existing) {
          if (net.derivation?.status === 'unsupported') return existing
          const forceCanonicalUtxoAddress = net.coinType === 'UTXO' && shouldForceCanonicalUtxoAddress(net.coinSymbol)
          if (forceCanonicalUtxoAddress) {
            // Continue to derivation below to canonicalize persisted legacy paths.
          } else if (net.coinType === 'UTXO' && net.coinSymbol) {
            if (isAddressForCoinSymbol(existing, net.coinSymbol)) return existing
          } else {
            return existing
          }
        }
        if (net.derivation?.status === 'unsupported') {
          console.warn(`[${net.symbol}] Derivation disabled: ${net.derivation.reason || 'unsupported in this build'}`)
          return null
        }
        const requiresMnemonic =
          net.coinType === 'EVM' || net.coinType === 'XRP' || net.coinType === 'UTXO' || net.id === 'ada' || net.id === 'xmr'
        if (requiresMnemonic && !sessionMnemonic) return null
        const accountIndex = resolveDerivationIndex(acc, accounts.findIndex((a) => a.id === acc.id))
        const forceCanonicalUtxoAddress = net.coinType === 'UTXO' && shouldForceCanonicalUtxoAddress(net.coinSymbol)

        // Derive address on demand
        try {
          let address = ''
          if (net.coinType === 'EVM') {
            address = deriveEvmWallet(sessionMnemonic!, accountIndex).address
          } else if (net.coinType === 'XRP') {
            const derived = await deriveXrpAddress(sessionMnemonic!, accountIndex)
            address = derived.address
          } else if (net.coinType === 'UTXO' && net.coinSymbol) {
            const derived = await deriveUtxoAddress(sessionMnemonic!, net.coinSymbol, accountIndex, 0, 0)
            address = derived.address
            if (forceCanonicalUtxoAddress && existing && existing !== address) {
              console.info(`[${net.symbol}] migrated canonical address ${existing} -> ${address}`)
            } else {
              console.log(`âœ“ Derived ${net.symbol} address on demand: ${address}`)
            }
          } else if (net.id === 'ada') {
            const derived = await deriveCardanoAddress(sessionMnemonic!, accountIndex, net.rpcUrl)
            address = derived.address
          } else if (net.id === 'xmr') {
            const derived = await deriveMoneroAddress(sessionMnemonic!, accountIndex, net.rpcUrl)
            address = derived.address
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

        if (net.coinType === 'EVM') {
          const trackedTokens = resolveTrackedEvmTokens(net.id)
          if (trackedTokens.length === 0) {
            set((state) => ({
              networkAssets: {
                ...state.networkAssets,
                [activeNetworkId]: {}
              }
            }))
            return
          }

          try {
            const provider = new ethers.JsonRpcProvider(net.rpcUrl, net.chainId)
            const balances = await Promise.all(
              trackedTokens.map(async (token) => {
                const contract = new ethers.Contract(token.address, EVM_ERC20_MIN_ABI, provider)
                const [rawBalance, symbolRaw, decimalsRaw] = await Promise.all([
                  contract.balanceOf(address) as Promise<bigint>,
                  contract.symbol().catch(() => token.symbol) as Promise<string>,
                  contract.decimals().catch(() => token.decimals) as Promise<number>
                ])
                const decimals = Number.isInteger(Number(decimalsRaw)) ? Number(decimalsRaw) : token.decimals
                const displaySats = toAssetDisplaySats(rawBalance, decimals)
                if (!Number.isFinite(displaySats) || displaySats <= 0) return null
                const symbol = String(symbolRaw || token.symbol || token.address.slice(0, 6)).trim().toUpperCase()
                return [symbol, displaySats] as const
              })
            )

            const assets = Object.fromEntries(
              balances.filter((row): row is readonly [string, number] => Boolean(row))
            ) as Record<string, number>

            set((state) => ({
              networkAssets: {
                ...state.networkAssets,
                [activeNetworkId]: assets
              }
            }))
          } catch (err) {
            console.warn(`[${net.symbol}] fetchNetworkAssets failed:`, err)
          }
          return
        }

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
          donationPercent:  clampDonationPercent(Number((backup as any).donationPercent ?? MIN_DONATION_PERCENT)),
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
      setDonationPercent: (percent) => set({ donationPercent: clampDonationPercent(Number(percent)) }),
      
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
        } else if (selectedNetwork.id === 'ada') {
          const derived = await deriveCardanoAddress(sessionMnemonic, derivationIndex, selectedNetwork.rpcUrl)
          selectedAddress = derived.address
        } else if (selectedNetwork.id === 'xmr') {
          const derived = await deriveMoneroAddress(sessionMnemonic, derivationIndex, selectedNetwork.rpcUrl)
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
          name: `Account ${derivationIndex + 1}`,
          networkNames: { [selectedNetwork.id]: normalizedName },
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

      setNetworkAccountName: (accountId, networkId, name) => {
        const normalizedName = String(name || '').trim()
        if (!normalizedName) throw new Error('Account name is required')
        set((state) => ({
          accounts: state.accounts.map((acc) => (
            acc.id === accountId
              ? {
                  ...acc,
                  networkNames: {
                    ...(acc.networkNames ?? {}),
                    [networkId]: normalizedName
                  }
                }
              : acc
          ))
        }))
      },

      setWatchOnlyAddress: (accountId, networkId, address) => {
        const { accounts, networks } = get()
        const net = networks.find((n) => n.id === networkId)
        if (!net) throw new Error(`Unknown network: ${networkId}`)
        if (net.derivation?.status !== 'unsupported') {
          throw new Error(`${net.name} does not require watch-only import`)
        }

        const validation = validateWatchOnlyAddress(net, address)
        if (!validation.ok) throw new Error(validation.error || 'Invalid watch-only address')

        set({
          accounts: accounts.map((acc) => (
            acc.id === accountId
              ? {
                  ...acc,
                  networkAddresses: {
                    ...(acc.networkAddresses ?? {}),
                    [networkId]: validation.normalized
                  }
                }
              : acc
          ))
        })
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
        set((state) => ({
          balanceRefreshNonce: requestNonce,
          // Keep last known sync status while probing, avoid flashing "Sync ..."
          // on every refresh tick before real chain info is resolved.
          isSyncing: state.isSyncing,
          syncPercent: state.syncPercent,
          accounts: state.accounts
        }))

        // â”€â”€ Resolve the correct per-network address â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        // NEVER fall back to acc.addresses.UTXO â€” that slot holds the FIRST UTXO
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
          console.warn(`No address for ${activeNetworkId} â€” skipping balance refresh`)
          await waitForUiStabilize()
          if (isStaleRequest()) return
          set({ isSyncing: false, isConnected: false, syncPercent: null, lowSyncStreak: 0 })
          return
        }

        try {
          if (net.coinType === 'EVM') {
            const snapshot = await fetchChainBalanceAndSync({
              network: net,
              address
            })
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
                      balance: snapshot.balance,
                      networkBalances: {
                        ...(a.networkBalances ?? {}),
                        [activeNetworkId]: snapshot.balance
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
          const snapshot = await fetchChainBalanceAndSync({
            network: net,
            address,
            rpcConfig
          })
          await waitForUiStabilize()
          if (isStaleRequest()) return
          set((state) => ({
            isSyncing: snapshot.isSyncing,
            isConnected: true,
            syncPercent: snapshot.syncPercent,
            lowSyncStreak: (() => {
              const syncPercentIsLow =
                typeof snapshot.syncPercent === 'number'
                && Number.isFinite(snapshot.syncPercent)
                && snapshot.syncPercent < MIN_SYNC_PERCENT_FOR_SEND
              const lowSyncCheck = snapshot.isSyncing || syncPercentIsLow
              return lowSyncCheck ? Math.min(50, (state.lowSyncStreak || 0) + 1) : 0
            })(),
            accounts: state.accounts.map((a) =>
              a.id === acc.id
                ? {
                    ...a,
                    balance: snapshot.balance,
                    networkBalances: {
                      ...(a.networkBalances ?? {}),
                      [activeNetworkId]: snapshot.balance
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
        const isBtczBridgeMode =
          String(net.coinSymbol || '').trim().toUpperCase() === 'BTCZ' && !useLocalRpc
            const snapshot = await fetchChainBalanceAndSync({
              network: net,
              address,
              rpcConfig,
              skipChainSyncProbe: isBtczBridgeMode,
              preferAddressIndexBalance: supportsAddressIndexBalance(net.coinSymbol),
              zeroBalanceRecheckMs: !skipZeroBalanceRecheck && !fastMode ? UTXO_ZERO_BALANCE_RECHECK_MS : 0
            })
            console.info(`[${net.symbol}] connected via bridge`)

            await waitForUiStabilize()
            if (isStaleRequest()) return
            set((state) => ({
              lowSyncStreak: (() => {
                const syncPercentIsLow = typeof snapshot.syncPercent === 'number' && Number.isFinite(snapshot.syncPercent) && snapshot.syncPercent < MIN_SYNC_PERCENT_FOR_SEND
                const lowSyncCheck = snapshot.isSyncing || syncPercentIsLow
                return lowSyncCheck ? Math.min(50, (state.lowSyncStreak || 0) + 1) : 0
              })(),
              isSyncing: snapshot.isSyncing,
              isConnected: true,
              syncPercent: snapshot.syncPercent,
              accounts: state.accounts.map((a) =>
                a.id === acc.id
                  ? {
                      ...a,
                      balance: snapshot.balance,
                      networkBalances: {
                        ...(a.networkBalances ?? {}),
                        [activeNetworkId]: snapshot.balance
                      }
                    }
                  : a
              )
            }))
          } else if (net.id === 'ada') {
            const { useLocalRpc, localRpcOverrides } = get()
            const rpcConfig = await createUtxoRpcConfig(net, {
              useLocalRpc,
              localRpcOverride: localRpcOverrides[net.id],
              secureBridgeSigner: get().signBackendAuthMessage
            })
            const snapshot = await fetchChainBalanceAndSync({
              network: net,
              address,
              rpcConfig
            })
            await waitForUiStabilize()
            if (isStaleRequest()) return
            set((state) => ({
              isSyncing: snapshot.isSyncing,
              isConnected: true,
              syncPercent: snapshot.syncPercent,
              lowSyncStreak: (() => {
                const syncPercentIsLow = typeof snapshot.syncPercent === 'number' && Number.isFinite(snapshot.syncPercent) && snapshot.syncPercent < MIN_SYNC_PERCENT_FOR_SEND
                const lowSyncCheck = snapshot.isSyncing || syncPercentIsLow
                return lowSyncCheck ? Math.min(50, (state.lowSyncStreak || 0) + 1) : 0
              })(),
              accounts: state.accounts.map((a) =>
                a.id === acc.id
                  ? {
                      ...a,
                      balance: snapshot.balance,
                      networkBalances: {
                        ...(a.networkBalances ?? {}),
                        [activeNetworkId]: snapshot.balance
                      }
                    }
                  : a
              )
            }))
          } else if (net.id === 'xmr') {
            const { useLocalRpc, localRpcOverrides } = get()
            const rpcConfig = await createUtxoRpcConfig(net, {
              useLocalRpc,
              localRpcOverride: localRpcOverrides[net.id],
              secureBridgeSigner: get().signBackendAuthMessage
            })
            const snapshot = await fetchChainBalanceAndSync({
              network: net,
              address,
              rpcConfig
            })
            await waitForUiStabilize()
            if (isStaleRequest()) return
            set((state) => ({
              isSyncing: snapshot.isSyncing,
              isConnected: true,
              syncPercent: snapshot.syncPercent,
              lowSyncStreak: (() => {
                const syncPercentIsLow = typeof snapshot.syncPercent === 'number' && Number.isFinite(snapshot.syncPercent) && snapshot.syncPercent < MIN_SYNC_PERCENT_FOR_SEND
                const lowSyncCheck = snapshot.isSyncing || syncPercentIsLow
                return lowSyncCheck ? Math.min(50, (state.lowSyncStreak || 0) + 1) : 0
              })(),
              accounts: state.accounts.map((a) =>
                a.id === acc.id
                  ? {
                      ...a,
                      balance: snapshot.balance,
                      networkBalances: {
                        ...(a.networkBalances ?? {}),
                        [activeNetworkId]: snapshot.balance
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

          // Non-transient failure â†’ mark disconnected.
          console.error(`[${net?.symbol}] all RPC attempts failed:`, err)
          await waitForUiStabilize()
          if (isStaleRequest()) return
          set({ isSyncing: false, isConnected: false, lowSyncStreak: 0 })
        }
      },

      probeActiveChainModel: async () => {
        const { networks, activeNetworkId, accounts, activeAccountId, useLocalRpc, localRpcOverrides } = get()
        const net = networks.find((n) => n.id === activeNetworkId)
        const acc = accounts.find((a) => a.id === activeAccountId) || accounts[0]
        if (!net || !acc) throw new Error('No active account/network')

        const profile = getCoinRuntimeProfile(net.id)
        const sendCustodyMode = resolveChainSendCustodyMode(net)
        const backendMode: ChainModelLiveSnapshot['backendMode'] =
          net.coinType === 'EVM'
            ? 'evm-rpc'
            : (useLocalRpc ? 'local-rpc' : 'bridge')

        let address: string | null = acc.networkAddresses?.[activeNetworkId] ?? null
        if (address && net.coinType === 'UTXO' && net.coinSymbol && !isAddressForCoinSymbol(address, net.coinSymbol)) {
          address = null
        }
        if (!address && net.coinType === 'EVM') address = acc.addresses?.EVM ?? null
        if (!address || net.coinType === 'UTXO') {
          const ensured = await get().ensureNetworkAddress(activeNetworkId)
          if (ensured) address = ensured
        }
        const resolvedAddress = String(address || '').trim()

        const base: ChainModelLiveSnapshot = {
          networkId: net.id,
          symbol: net.symbol,
          protocol: profile?.protocol || 'unknown',
          backendMode,
          address: resolvedAddress,
          addressValid: false,
          balance: getCachedBalanceForNetwork(acc, activeNetworkId, true),
          syncPercent: get().syncPercent,
          isSyncing: get().isSyncing,
          isConnected: get().isConnected,
          nonCustodialCompliant: sendCustodyMode === 'non-custodial',
          sendCustodyMode,
          serverMatched: false,
          checkedAt: Date.now()
        }
        if (!resolvedAddress) {
          return { ...base, error: 'No active address for network/account' }
        }

        try {
          if (net.coinType === 'EVM') {
            const [snapshot, addressValid] = await Promise.all([
              fetchChainBalanceAndSync({
                network: net,
                address: resolvedAddress
              }),
              validateChainAddress(net, undefined, resolvedAddress)
            ])
            return {
              ...base,
              checkedAt: Date.now(),
              addressValid,
              balance: snapshot.balance,
              syncPercent: snapshot.syncPercent,
              isSyncing: snapshot.isSyncing,
              isConnected: true,
              serverMatched: true
            }
          }

          const rpcConfig = await createUtxoRpcConfig(net, {
            useLocalRpc,
            localRpcOverride: localRpcOverrides[net.id],
            secureBridgeSigner: get().signBackendAuthMessage
          })
          const [snapshot, addressValid] = await Promise.all([
            fetchChainBalanceAndSync({
              network: net,
              address: resolvedAddress,
              rpcConfig,
              preferAddressIndexBalance: net.coinType === 'UTXO' ? supportsAddressIndexBalance(net.coinSymbol) : undefined
            }),
            validateChainAddress(net, rpcConfig, resolvedAddress)
          ])
          return {
            ...base,
            checkedAt: Date.now(),
            addressValid,
            balance: snapshot.balance,
            syncPercent: snapshot.syncPercent,
            isSyncing: snapshot.isSyncing,
            isConnected: true,
            serverMatched: true
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          return {
            ...base,
            checkedAt: Date.now(),
            isConnected: false,
            serverMatched: false,
            error: message
          }
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
        return await sendChainTransaction({
          network: net,
          to,
          amount,
          evm: {
            mnemonic: sessionMnemonic,
            accountIndex
          }
        })
      },

      sendXrpTransaction: async ({ to, amount }) => {
        const { networks, activeNetworkId, accounts, activeAccountId, sessionMnemonic, isLocked, useLocalRpc, localRpcOverrides } = get()
        if (isLocked || !sessionMnemonic) throw new Error('Wallet is locked')
        const net = networks.find((n) => n.id === activeNetworkId)
        if (!net || net.coinType !== 'XRP') throw new Error('Active network is not XRP')
        const acc = accounts.find((a) => a.id === activeAccountId) || accounts[0]
        if (!acc) throw new Error('No active account')
        const accountIndex = resolveDerivationIndex(acc, accounts.findIndex((a) => a.id === acc.id))
        const derived = await deriveXrpAddress(sessionMnemonic, accountIndex)
        const activeAddress = String(
          acc.networkAddresses?.[activeNetworkId]
          || acc.addresses?.XRP
          || derived.address
        ).trim()
        if (activeAddress !== derived.address) {
          throw new Error(`Active XRP address does not match derived signer address (${activeAddress} != ${derived.address})`)
        }
        const rpcConfig = await createUtxoRpcConfig(net, {
          useLocalRpc,
          localRpcOverride: localRpcOverrides[net.id],
          secureBridgeSigner: get().signBackendAuthMessage
        })
        return await sendChainTransaction({
          network: net,
          to,
          amount,
          xrpSend: () => sendXrpNonCustodial({
            rpcConfig,
            fromAddress: activeAddress,
            toAddress: to,
            amountXrp: amount,
            privateKeyHex: derived.privHex,
            publicKeyHex: derived.pubHex
          })
        })
      },

      sendCardanoTransaction: async ({ to, amount }) => {
        const { networks, activeNetworkId, accounts, activeAccountId, sessionMnemonic, isLocked } = get()
        if (isLocked || !sessionMnemonic) throw new Error('Wallet is locked')
        const net = networks.find((n) => n.id === activeNetworkId)
        if (!net || net.id !== 'ada') throw new Error('Active network is not Cardano')
        const acc = accounts.find((a) => a.id === activeAccountId) || accounts[0]
        const accountIndex = resolveDerivationIndex(acc, accounts.findIndex((a) => a.id === acc.id))
        const fromAddress = acc?.networkAddresses?.[activeNetworkId] || await get().ensureNetworkAddress(activeNetworkId)
        if (!fromAddress) throw new Error(`No address derived for ${net.name}`)
        return await sendCardanoNonCustodial({
          network: net,
          mnemonic: sessionMnemonic,
          accountIndex,
          fromAddress,
          toAddress: to,
          amountAda: amount,
          walletId: String(net.rpcWallet || '').trim() || undefined
        })
      },

      sendMoneroTransaction: async ({ to, amount }) => {
        const { networks, activeNetworkId, accounts, activeAccountId, sessionMnemonic, isLocked } = get()
        if (isLocked || !sessionMnemonic) throw new Error('Wallet is locked')
        const net = networks.find((n) => n.id === activeNetworkId)
        if (!net || net.id !== 'xmr') throw new Error('Active network is not Monero')
        const acc = accounts.find((a) => a.id === activeAccountId) || accounts[0]
        const accountIndex = resolveDerivationIndex(acc, accounts.findIndex((a) => a.id === acc.id))
        const fromAddress = acc?.networkAddresses?.[activeNetworkId] || await get().ensureNetworkAddress(activeNetworkId)
        if (!fromAddress) throw new Error(`No address derived for ${net.name}`)
        return await sendMoneroNonCustodial({
          network: net,
          mnemonic: sessionMnemonic,
          accountIndex,
          fromAddress,
          toAddress: to,
          amountXmr: amount
        })
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
        return await sendUtxoNonCustodialTransaction({
          network: net,
          rpcConfig,
          senderAddress,
          to,
          amount,
          donation,
          deriveSigningKey: async (resolvedSenderAddress) => {
            const derived = await deriveSigningKeyForSenderAddress(
              sessionMnemonic,
              net,
              accountIndex,
              resolvedSenderAddress
            )
            return { privHex: derived.privHex }
          }
        })
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
        donationPercent: state.donationPercent,
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
          activeNetworkId,
          donationPercent: clampDonationPercent(Number((persisted as any).donationPercent ?? merged.donationPercent ?? MIN_DONATION_PERCENT))
        }
      }
    }
  )
)

