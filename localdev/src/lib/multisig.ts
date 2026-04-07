import type { CoinProtocolFamily } from '../coins/registryTypes'
import {
  SAFE_MULTISIG_SUPPORTED_CHAIN_IDS,
  getSafeServiceConfiguration,
  isSupportedSafeMultisigChainId
} from './safeConfig'

export type AccountKind = 'derived' | 'watch_only' | 'multisig'
export { SAFE_MULTISIG_SUPPORTED_CHAIN_IDS }

export type MultisigFamily = 'safe' | 'btc-psbt-v1' | 'rtm-utxo-asset-multisig-v1'
export type PlannedMultisigFamily = 'btcz-transparent-multisig' | 'rtm-utxo-asset-multisig'
export type WalletMultisigFamily = MultisigFamily | PlannedMultisigFamily
export type MultisigReadinessStatus = 'wallet-ready' | 'planned' | 'partial' | 'unsupported'

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
  family: WalletMultisigFamily | 'unsupported'
  walletReady: boolean
  status: MultisigReadinessStatus
  label: string
  reason?: string
}

export interface RuntimeSupportDescriptor {
  runtimeFamily: CoinProtocolFamily
  runtimeLabel: string
  multisig: NetworkMultisigCapability
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
  TRON: string
  XMR: string
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

const MULTISIG_EXECUTION_GUIDANCE = 'Use the wallet multisig flow to propose, confirm, or execute transactions.'

export const MULTISIG_WALLET_MANAGED_ONLY_REASON =
  `Multisig accounts are wallet-managed only in this build. ${MULTISIG_EXECUTION_GUIDANCE}`

const MULTISIG_BLOCKED_DAPP_METHODS = new Set([
  'wallet_signmessage',
  'personal_sign',
  'eth_sign',
  'wallet_rtmsignmessage',
  'wallet_rtmgetpublickey',
  'wallet_signtypeddata',
  'eth_signtypeddata',
  'eth_signtypeddata_v3',
  'eth_signtypeddata_v4',
  'wallet_signtransaction',
  'eth_signtransaction',
  'wallet_signalltransactions',
  'wallet_signandsendtransaction',
  'eth_sendtransaction',
  'wallet_sendtransaction',
  'metayoshi_sendtransaction',
  'rtm_sendtransaction',
  'wallet_sendasset',
  'metayoshi_sendasset',
  'rtm_sendasset',
  'wallet_cosmosgetkey',
  'wallet_cosmossigndirect',
  'wallet_cosmossignamino',
  'wallet_cosmossendtx',
  'wallet_rtmmarketaction',
  'wallet_rtmissueraction'
])

const RUNTIME_LABELS: Record<CoinProtocolFamily, string> = {
  evm: 'EVM',
  utxo: 'UTXO',
  cosmos: 'Cosmos',
  cardano: 'Cardano',
  monero: 'Monero',
  solana: 'Solana',
  sui: 'Sui',
  stellar: 'Stellar',
  tron: 'TRON',
  xrp: 'XRP',
  generic: 'Generic'
}

const PLANNED_BTC_MULTISIG_KEYS = new Set(['srv--bitcoin', 'bitcoin', 'btc'])
const PLANNED_BTCZ_MULTISIG_KEYS = new Set(['btcz'])
const PLANNED_RTM_MULTISIG_KEYS = new Set(['rtm'])

type RuntimeSupportNetwork = {
  id?: string | null
  runtimeModelId?: string | null
  coinSymbol?: string | null
  coinType?: string | null
  chainId?: string | number | null
}

function normalizeNetworkCapabilityKey(value: unknown): string {
  return String(value || '').trim().toLowerCase()
}

function matchesPlannedNetwork(network: RuntimeSupportNetwork | null | undefined, keys: Set<string>): boolean {
  if (!network) return false
  const candidates = [
    normalizeNetworkCapabilityKey(network.id),
    normalizeNetworkCapabilityKey(network.runtimeModelId),
    normalizeNetworkCapabilityKey(network.coinSymbol)
  ].filter(Boolean)
  return candidates.some((candidate) => keys.has(candidate))
}

function createMultisigSupportDescriptor(
  family: NetworkMultisigCapability['family'],
  status: MultisigReadinessStatus,
  label: string,
  reason?: string
): NetworkMultisigCapability {
  return {
    family,
    walletReady: status === 'wallet-ready',
    status,
    label,
    reason
  }
}

function resolveRuntimeLabel(family: CoinProtocolFamily): string {
  return RUNTIME_LABELS[family] || 'Generic'
}

function resolveRuntimeFamily(network: RuntimeSupportNetwork | null | undefined): CoinProtocolFamily {
  if (!network) return 'generic'
  const coinType = String(network.coinType || '').trim().toUpperCase()
  const runtimeModelId = String(network.runtimeModelId || '').trim().toLowerCase()
  const networkId = String(network.id || '').trim().toLowerCase()
  if (coinType === 'EVM') return 'evm'
  if (coinType === 'COSMOS') return 'cosmos'
  if (coinType === 'SOL' || runtimeModelId === 'sol' || runtimeModelId === 'solana' || networkId === 'sol') return 'solana'
  if (coinType === 'SUI' || runtimeModelId === 'sui' || networkId === 'sui') return 'sui'
  if (coinType === 'XLM' || runtimeModelId === 'xlm' || networkId === 'xlm') return 'stellar'
  if (coinType === 'XRP' || runtimeModelId === 'xrp' || networkId === 'xrp') return 'xrp'
  if (coinType === 'TRON' || runtimeModelId === 'tron' || networkId === 'tron') return 'tron'
  if (coinType === 'XMR' || runtimeModelId === 'xmr' || networkId === 'xmr') return 'monero'
  if (runtimeModelId === 'ada' || networkId === 'ada') return 'cardano'
  if (coinType === 'UTXO' || coinType === 'BTC') return 'utxo'
  return 'generic'
}

function resolveEvmMultisigSupport(
  network: RuntimeSupportNetwork,
  env?: Record<string, unknown>
): NetworkMultisigCapability {
  if (String(network.coinType || '').trim().toUpperCase() !== 'EVM') {
    return createMultisigSupportDescriptor('unsupported', 'unsupported', 'Unsupported')
  }
  const parsedChainId = typeof network.chainId === 'number' ? network.chainId : Number(String(network.chainId || '').trim())
  if (!isSupportedSafeMultisigChainId(parsedChainId)) {
    return createMultisigSupportDescriptor(
      'unsupported',
      'unsupported',
      'Single-signature only',
      'Only imported Safe accounts on configured Safe chains are wallet-ready in this build.'
    )
  }
  const safeService = getSafeServiceConfiguration(parsedChainId, env)
  if (!safeService.configured) {
    return createMultisigSupportDescriptor(
      'unsupported',
      'unsupported',
      'Safe endpoint required',
      `Safe multisig is enabled for ${safeService.label}, but no Safe service endpoint is configured. Set ${safeService.envKey} or VITE_SAFE_SERVICE_BASE_URL.`
    )
  }
  return createMultisigSupportDescriptor('safe', 'wallet-ready', 'Safe v1')
}

function resolveUtxoMultisigSupport(network: RuntimeSupportNetwork): NetworkMultisigCapability {
  if (matchesPlannedNetwork(network, PLANNED_BTC_MULTISIG_KEYS)) {
    return createMultisigSupportDescriptor(
      'btc-psbt-v1',
      'wallet-ready',
      'BTC PSBT v1',
      'Bitcoin p2wsh multisig can be imported and finalized locally when enough linked wallet signers match the witness script.'
    )
  }
  if (matchesPlannedNetwork(network, PLANNED_BTCZ_MULTISIG_KEYS)) {
    return createMultisigSupportDescriptor(
      'btcz-transparent-multisig',
      'planned',
      'BTCZ transparent multisig',
      'BitcoinZ still uses transparent raw-transaction signing and broadcast, not a wallet-ready multisig contract.'
    )
  }
  if (matchesPlannedNetwork(network, PLANNED_RTM_MULTISIG_KEYS)) {
    return createMultisigSupportDescriptor(
      'rtm-utxo-asset-multisig-v1',
      'wallet-ready',
      'RTM multisig v1',
      'Imported Raptoreum script-hash multisig can validate redeem scripts, sign native RTM and asset transfers locally, and relay the finalized transaction through the existing RTM path.'
    )
  }
  return createMultisigSupportDescriptor(
    'unsupported',
    'unsupported',
    'Single-signature only',
    'Only Bitcoin p2wsh and Raptoreum p2sh multisig are wallet-ready in this build.'
  )
}

function resolveRuntimeMultisigSupport(
  network: RuntimeSupportNetwork,
  runtimeFamily: CoinProtocolFamily,
  env?: Record<string, unknown>
): NetworkMultisigCapability {
  if (runtimeFamily === 'evm') return resolveEvmMultisigSupport(network, env)
  if (runtimeFamily === 'utxo') return resolveUtxoMultisigSupport(network)
  if (runtimeFamily === 'cosmos') {
    return createMultisigSupportDescriptor('unsupported', 'unsupported', 'Single-signature only', 'Cosmos-family chains are single-signature only in this build.')
  }
  if (runtimeFamily === 'solana') {
    return createMultisigSupportDescriptor('unsupported', 'unsupported', 'Single-signature only', 'Solana is single-signature only in this build.')
  }
  if (runtimeFamily === 'sui') {
    return createMultisigSupportDescriptor('unsupported', 'unsupported', 'Single-signature only', 'Sui is single-signature only in this build.')
  }
  if (runtimeFamily === 'stellar') {
    return createMultisigSupportDescriptor('unsupported', 'unsupported', 'Single-signature only', 'Stellar is single-signature only in this build.')
  }
  if (runtimeFamily === 'tron') {
    return createMultisigSupportDescriptor('unsupported', 'unsupported', 'Single-signature only', 'TRON is single-signature only in this build.')
  }
  if (runtimeFamily === 'monero') {
    return createMultisigSupportDescriptor('unsupported', 'unsupported', 'Single-signature only', 'Monero is single-signature only in this build.')
  }
  if (runtimeFamily === 'xrp') {
    return createMultisigSupportDescriptor('unsupported', 'unsupported', 'Single-signature only', 'XRP Ledger is single-signature only in this build.')
  }
  if (runtimeFamily === 'cardano') {
    return createMultisigSupportDescriptor('unsupported', 'unsupported', 'Single-signature only', 'Cardano is single-signature only in this build.')
  }
  return createMultisigSupportDescriptor('unsupported', 'unsupported', 'Single-signature only', 'This runtime family does not expose wallet-ready multisig in this build.')
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
    XLM: '',
    TRON: '',
    XMR: ''
  }
}

export function normalizeAccountKind(value: unknown): AccountKind {
  if (value === 'watch_only') return 'watch_only'
  if (value === 'multisig') return 'multisig'
  return 'derived'
}

export function isMultisigDappMethodBlocked(method: string): boolean {
  return MULTISIG_BLOCKED_DAPP_METHODS.has(String(method || '').trim().toLowerCase())
}

export function buildMultisigUnsupportedMethodMessage(method: string): string {
  return `${String(method || '').trim() || 'This method'} is not available for multisig accounts in this build. ${MULTISIG_EXECUTION_GUIDANCE}`
}

export function buildMultisigUnsupportedActionMessage(): string {
  return `This multisig account does not support dapp-driven signing or send requests in this build. ${MULTISIG_EXECUTION_GUIDANCE}`
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
  if (normalizedCoinType === 'BTC') return String(addresses.BTC || addresses.UTXO || '').trim()
  if (normalizedCoinType === 'SOL') return String(addresses.SOL || '').trim()
  if (normalizedCoinType === 'SUI') return String(addresses.SUI || '').trim()
  if (normalizedCoinType === 'XLM') return String(addresses.XLM || '').trim()
  if (normalizedCoinType === 'TRON') return String(addresses.TRON || '').trim()
  if (normalizedCoinType === 'XMR') return String(addresses.XMR || '').trim()
  return String(addresses.UTXO || addresses.EVM || '').trim()
}

export function getAccountKindLabel(account: BaseAccountShape | null | undefined): string {
  if (isMultisigAccount(account)) return 'Multisig'
  if (isWatchOnlyAccount(account)) return 'Watch-only'
  return 'Standard'
}

export function isSupportedSafeMultisigNetwork(network: RuntimeSupportNetwork | null | undefined): boolean {
  if (!network) return false
  if (String(network.coinType || '').trim().toUpperCase() !== 'EVM') return false
  return isSupportedSafeMultisigChainId(network.chainId)
}

export function isWalletReadySafeMultisigNetwork(
  network: RuntimeSupportNetwork | null | undefined,
  options?: { env?: Record<string, unknown> }
): boolean {
  const descriptor = getMultisigSupportDescriptor(network, options)
  return descriptor.family === 'safe' && descriptor.walletReady === true
}

export function getRuntimeSupportDescriptor(
  network: RuntimeSupportNetwork | null | undefined,
  options?: { env?: Record<string, unknown> }
): RuntimeSupportDescriptor {
  const runtimeFamily = resolveRuntimeFamily(network)
  const runtimeLabel = resolveRuntimeLabel(runtimeFamily)
  if (!network) {
    return {
      runtimeFamily,
      runtimeLabel,
      multisig: createMultisigSupportDescriptor('unsupported', 'unsupported', 'Unsupported')
    }
  }
  return {
    runtimeFamily,
    runtimeLabel,
    multisig: resolveRuntimeMultisigSupport(network, runtimeFamily, options?.env)
  }
}

export function getMultisigSupportDescriptor(
  network: RuntimeSupportNetwork | null | undefined,
  options?: { env?: Record<string, unknown> }
): NetworkMultisigCapability {
  return getRuntimeSupportDescriptor(network, options).multisig
}

export function getMultisigCapabilityForNetwork(
  network: RuntimeSupportNetwork | null | undefined,
  options?: { env?: Record<string, unknown> }
): NetworkMultisigCapability | null {
  const capability = getMultisigSupportDescriptor(network, options)
  return capability.status === 'unsupported' ? null : capability
}

export function isWalletReadyMultisigNetwork(
  network: RuntimeSupportNetwork | null | undefined,
  options?: { env?: Record<string, unknown> }
): boolean {
  return getMultisigSupportDescriptor(network, options).walletReady === true
}
