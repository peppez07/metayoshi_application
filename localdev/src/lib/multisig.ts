export type AccountKind = 'derived' | 'watch_only' | 'multisig'

export type MultisigFamily = 'safe'

export interface MultisigCapabilities {
  canPropose: boolean
  canExecute: boolean
  canSignMessages: boolean
  canSignTypedData: boolean
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

export type MultisigMetadata = SafeMultisigMetadata

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
