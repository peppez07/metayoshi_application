export const MIN_SYNC_PERCENT_FOR_SEND = 99

function isFinitePercent(value: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function isSendBlockedBySync(syncing: boolean, syncPercent: number | null, connected = false): boolean {
  // Keep send actions available during temporary "waiting/syncing" windows
  // once the wallet already has a good connection.
  if (connected && syncing && !isFinitePercent(syncPercent)) return false
  if (syncing) return true
  if (isFinitePercent(syncPercent)) return syncPercent < MIN_SYNC_PERCENT_FOR_SEND
  return false
}

export function getSendBlockedSyncReason(syncing: boolean, syncPercent: number | null, connected = false): string {
  if (!isSendBlockedBySync(syncing, syncPercent, connected)) return ''
  if (isFinitePercent(syncPercent)) {
    return `Network sync is ${syncPercent.toFixed(1)}%. Wait until at least ${MIN_SYNC_PERCENT_FOR_SEND.toFixed(2)}% to send.`
  }
  if (syncing) {
    return 'Network is still syncing. Wait until sync completes to send.'
  }
  return 'Network sync is too low to send right now.'
}
