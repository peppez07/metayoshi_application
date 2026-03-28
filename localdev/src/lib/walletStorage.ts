export const WALLET_STORAGE_KEY = 'metayoshi-storage'
export const WALLET_SESSION_MNEMONIC_KEY = 'metayoshi-session-mnemonic'

export type PersistedStateEnvelope<T> = {
  state: T
  version?: number
}

export function isPersistedStateEnvelope<T>(value: unknown): value is PersistedStateEnvelope<T> {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'state' in (value as Record<string, unknown>) &&
      typeof (value as { state?: unknown }).state === 'object'
  )
}

export function unwrapPersistedState<T>(raw: unknown): T | null {
  if (!raw || typeof raw !== 'object') return null
  if (isPersistedStateEnvelope<T>(raw)) {
    return (raw as PersistedStateEnvelope<T>).state
  }
  return raw as T
}

export async function readSessionMnemonicFromExtensionStorage(): Promise<string | null> {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage?.session) return null
    const stored = await chrome.storage.session.get(WALLET_SESSION_MNEMONIC_KEY)
    const mnemonic = String(stored[WALLET_SESSION_MNEMONIC_KEY] || '').trim()
    return mnemonic || null
  } catch {
    return null
  }
}

export async function writeSessionMnemonicToExtensionStorage(mnemonic: string | null | undefined): Promise<void> {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage?.session) return
    const normalized = String(mnemonic || '').trim()
    if (!normalized) {
      await chrome.storage.session.remove(WALLET_SESSION_MNEMONIC_KEY)
      return
    }
    await chrome.storage.session.set({ [WALLET_SESSION_MNEMONIC_KEY]: normalized })
  } catch {
    // ignore session storage write failures
  }
}

export async function clearSessionMnemonicFromExtensionStorage(): Promise<void> {
  await writeSessionMnemonicToExtensionStorage(null)
}
