export interface AccountNameLike {
  name?: string
  networkNames?: Record<string, string>
}

export function getAccountDisplayName(account: AccountNameLike | undefined, networkId?: string, fallback = 'Account'): string {
  if (!account) return fallback
  const byNetwork = networkId ? String(account.networkNames?.[networkId] || '').trim() : ''
  if (byNetwork) return byNetwork
  if (networkId) return fallback
  const legacy = String(account.name || '').trim()
  return legacy || fallback
}
