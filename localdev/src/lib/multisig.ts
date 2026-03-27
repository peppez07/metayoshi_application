export type AccountKind = 'derived' | 'watch_only' | 'multisig'
export const SAFE_MULTISIG_SUPPORTED_CHAIN_IDS = [1, 10, 100, 137, 8453, 42161, 43114] as const
const SAFE_MULTISIG_SUPPORTED_CHAIN_ID_SET = new Set<number>(SAFE_MULTISIG_SUPPORTED_CHAIN_IDS)

export type MultisigFamily = 'safe' | 'btc-psbt-v1' | 'rtm-utxo-asset-multisig-v1'
export type PlannedMultisigFamily = 'btcz-transparent-multisig' | 'rtm-utxo-asset-multisig'
export type WalletMultisigFamily = MultisigFamily | PlannedMultisigFamily
export type MultisigReadinessStatus = 'wallet-ready' | 'planned' | 'partial'

export interface MultisigCapabilities {
  canPropose: boolean
  canExecute: boolean
  canSignMessages: boolean
  canSignTypedData: boolean
  nativeRtm?: boolean
  assets?: boolean
  dappSend?: boolean
}

export interface NetworkMultisigCapability {
  family: WalletMultisigFamily
  walletReady: boolean
  status: MultisigReadinessStatus
  label: string
  reason?: string
}

export interface SafeMultisigMetadata {
  family: 'safe'
  networkId: string
  address: string
  owners: string[]
  threshold: number
  ownerSignerAccountId: string | null
  capabilities: MultisigCapabilities
  pendingProposalCount?: number
}

export interface BtcMultisigSigner {
  pubkey: string
  fingerprint?: string
  derivationPath?: string
  label?: string
}

export interface BtcMultisigMetadata {
  family: 'btc-psbt-v1'
  networkId: 'srv--bitcoin'
  address: string
  threshold: number
  scriptType: 'p2wsh'
  witnessScriptHex: string
  signers: BtcMultisigSigner[]
  linkedSignerAccountIds: string[]
  capabilities: MultisigCapabilities
}

export interface RtmMultisigSigner {
  pubkey: string
  fingerprint?: string
  derivationPath?: string
  label?: string
}

export interface RtmMultisigMetadata {
  family: 'rtm-utxo-asset-multisig-v1'
  networkId: 'rtm'
  address: string
  threshold: number
  scriptType: 'p2sh'
  redeemScriptHex: string
  signers: RtmMultisigSigner[]
  linkedSignerAccountIds: string[]
  capabilities: MultisigCapabilities
}

export type MultisigMetadata = SafeMultisigMetadata | BtcMultisigMetadata | RtmMultisigMetadata

export interface AccountAddresses {
  EVM: string
  UTXO: string
  BTC: string
  COSMOS: string
  SOL: string
  SUI: string
  XRP: string
  XLM: string
}

export interface BaseAccountShape {
  id: string
  name?: string
  kind?: string
  networkNames?: Record<string, string>
  derivationIndex?: number
  addresses?: Partial<AccountAddresses>
  networkAddresses?: Record<string, string>
  networkBalances?: Record<string, string>
  balance?: string
  multisig?: any
}

export function createEmptyAccountAddresses(): AccountAddresses {
  return {
    EVM: '',
    UTXO: '',
    BTC: '',
    COSMOS: '',
    SOL: '',
    SUI: '',
    XRP: '',
    XLM: ''
  }
}

export function normalizeAccountKind(value: unknown): AccountKind {
  if (value === 'watch_only') return 'watch_only'
  if (value === 'multisig') return 'multisig'
  return 'derived'
}

export function isMultisigAccount<T extends BaseAccountShape>(account: T | null | undefined): account is T & { kind: 'multisig'; multisig: MultisigMetadata } {
  return normalizeAccountKind(account?.kind) === 'multisig' && Boolean(account?.multisig)
}

export function isSafeMultisigMetadata(value: unknown): value is SafeMultisigMetadata {
  return Boolean(value && typeof value === 'object' && (value as SafeMultisigMetadata).family === 'safe')
}

export function isBtcMultisigMetadata(value: unknown): value is BtcMultisigMetadata {
  return Boolean(value && typeof value === 'object' && (value as BtcMultisigMetadata).family === 'btc-psbt-v1')
}

export function isRtmMultisigMetadata(value: unknown): value is RtmMultisigMetadata {
  return Boolean(value && typeof value === 'object' && (value as RtmMultisigMetadata).family === 'rtm-utxo-asset-multisig-v1')
}

export function isSafeMultisigAccount<T extends BaseAccountShape>(account: T | null | undefined): account is T & { kind: 'multisig'; multisig: SafeMultisigMetadata } {
  return isMultisigAccount(account) && isSafeMultisigMetadata(account.multisig)
}

export function isBtcMultisigAccount<T extends BaseAccountShape>(account: T | null | undefined): account is T & { kind: 'multisig'; multisig: BtcMultisigMetadata } {
  return isMultisigAccount(account) && isBtcMultisigMetadata(account.multisig)
}

export function isRtmMultisigAccount<T extends BaseAccountShape>(account: T | null | undefined): account is T & { kind: 'multisig'; multisig: RtmMultisigMetadata } {
  return isMultisigAccount(account) && isRtmMultisigMetadata(account.multisig)
}

export function isWatchOnlyAccount<T extends BaseAccountShape>(account: T | null | undefined): account is T & { kind: 'watch_only' } {
  return normalizeAccountKind(account?.kind) === 'watch_only'
}

export function getMultisigAddress(account: BaseAccountShape | null | undefined, networkId?: string): string {
  if (!isMultisigAccount(account)) return ''
  const address = String(account?.multisig?.address || '').trim()
  if (!address) return ''
  const multisigNetworkId = String(account?.multisig?.networkId || '').trim()
  if (!networkId || !multisigNetworkId || multisigNetworkId === String(networkId || '').trim()) {
    return address
  }
  return ''
}

export function getAccountAddressForNetwork(
  account: BaseAccountShape | null | undefined,
  networkId: string,
  coinType?: string | null
): string {
  if (!account) return ''
  const normalizedNetworkId = String(networkId || '').trim()
  const multisigAddress = getMultisigAddress(account, normalizedNetworkId)
  if (multisigAddress) return multisigAddress

  const networkAddress = String(account.networkAddresses?.[normalizedNetworkId] || '').trim()
  if (networkAddress) return networkAddress

  const addresses = account.addresses ?? {}
  const normalizedCoinType = String(coinType || '').trim().toUpperCase()
  if (normalizedCoinType === 'EVM') return String(addresses.EVM || '').trim()
  if (normalizedCoinType === 'XRP') return String(addresses.XRP || '').trim()
  if (normalizedCoinType === 'COSMOS') return String(addresses.COSMOS || '').trim()
  if (normalizedCoinType === 'UTXO') return String(addresses.UTXO || '').trim()
  if (normalizedCoinType === 'SOL') return String(addresses.SOL || '').trim()
  if (normalizedCoinType === 'SUI') return String(addresses.SUI || '').trim()
  if (normalizedCoinType === 'XLM') return String(addresses.XLM || '').trim()
  return String(addresses.UTXO || addresses.EVM || '').trim()
}

export function getAccountKindLabel(account: BaseAccountShape | null | undefined): string {
  if (isMultisigAccount(account)) return 'Multisig'
  if (isWatchOnlyAccount(account)) return 'Watch-only'
  return 'Standard'
}

export function isSupportedSafeMultisigChainId(value: unknown): boolean {
  const parsed = typeof value === 'number' ? value : Number(String(value || '').trim())
  return Number.isInteger(parsed) && parsed > 0 && SAFE_MULTISIG_SUPPORTED_CHAIN_ID_SET.has(parsed)
}

export function isSupportedSafeMultisigNetwork(network: { coinType?: string | null; chainId?: string | number | null } | null | undefined): boolean {
  if (!network) return false
  if (String(network.coinType || '').trim().toUpperCase() !== 'EVM') return false
  return isSupportedSafeMultisigChainId(network.chainId)
}

function normalizeNetworkCapabilityKey(value: unknown): string {
  return String(value || '').trim().toLowerCase()
}

function matchesPlannedNetwork(
  network: {
    id?: string | null
    runtimeModelId?: string | null
    coinSymbol?: string | null
  } | null | undefined,
  keys: Set<string>
): boolean {
  if (!network) return false
  const candidates = [
    normalizeNetworkCapabilityKey(network.id),
    normalizeNetworkCapabilityKey(network.runtimeModelId),
    normalizeNetworkCapabilityKey(network.coinSymbol)
  ].filter(Boolean)
  return candidates.some((candidate) => keys.has(candidate))
}

const PLANNED_BTC_MULTISIG_KEYS = new Set(['srv--bitcoin', 'bitcoin', 'btc'])
const PLANNED_BTCZ_MULTISIG_KEYS = new Set(['btcz'])
const PLANNED_RTM_MULTISIG_KEYS = new Set(['rtm'])

export function getMultisigCapabilityForNetwork(
  network: {
    id?: string | null
    runtimeModelId?: string | null
    coinSymbol?: string | null
    coinType?: string | null
    chainId?: string | number | null
  } | null | undefined
): NetworkMultisigCapability | null {
  if (!network) return null
  if (isSupportedSafeMultisigNetwork(network)) {
    return {
      family: 'safe',
      walletReady: true,
      status: 'wallet-ready',
      label: 'Safe v1'
    }
  }
  if (matchesPlannedNetwork(network, PLANNED_BTC_MULTISIG_KEYS)) {
    return {
      family: 'btc-psbt-v1',
      walletReady: true,
      status: 'wallet-ready',
      label: 'BTC PSBT v1',
      reason: 'Bitcoin p2wsh multisig can be imported and finalized locally when enough linked wallet signers match the witness script.'
    }
  }
  if (matchesPlannedNetwork(network, PLANNED_BTCZ_MULTISIG_KEYS)) {
    return {
      family: 'btcz-transparent-multisig',
      walletReady: false,
      status: 'planned',
      label: 'BTCZ transparent multisig',
      reason: 'BitcoinZ still uses transparent raw-transaction signing and broadcast, not a wallet-ready multisig contract.'
    }
  }
  if (matchesPlannedNetwork(network, PLANNED_RTM_MULTISIG_KEYS)) {
    return {
      family: 'rtm-utxo-asset-multisig-v1',
      walletReady: true,
      status: 'wallet-ready',
      label: 'RTM multisig v1',
      reason: 'Imported Raptoreum script-hash multisig can validate redeem scripts, sign native RTM and asset transfers locally, and relay the finalized transaction through the existing RTM path.'
    }
  }
  return null
}

export function isWalletReadyMultisigNetwork(
  network: {
    id?: string | null
    runtimeModelId?: string | null
    coinSymbol?: string | null
    coinType?: string | null
    chainId?: string | number | null
  } | null | undefined
): boolean {
  return getMultisigCapabilityForNetwork(network)?.walletReady === true
}
