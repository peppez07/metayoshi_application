const STABLE_NETWORK_IDS = new Set(['rtm', 'eth', 'dash', 'btcz', 'firo'])

export function sanitizeTxIdForExplorer(value: string): string {
  let txid = String(value || '').trim()
  if (!txid) return ''
  txid = txid.replace(/^"+|"+$/g, '').trim()
  txid = txid.replace(/^'+|'+$/g, '').trim()
  return txid
}

export function normalizeActivityNetworkId(value: string): string {
  const raw = String(value || '').trim()
  const lower = raw.toLowerCase()
  if (!lower) return ''
  if (lower === 'sdash' || lower === 'srv--dash') return 'dash'
  if (lower === 'btc' || lower === 'bitcoin' || lower === 'srv--btc') return 'srv--bitcoin'
  if (lower.endsWith('-mainnet')) {
    const base = lower.slice(0, -'-mainnet'.length)
    if (STABLE_NETWORK_IDS.has(base)) return base
  }
  if (STABLE_NETWORK_IDS.has(lower)) return lower
  if (lower.startsWith('srv--')) return lower
  return raw
}

export function buildTxExplorerUrl(explorerBaseUrl: string, networkId: string, txid: string): string {
  const base = String(explorerBaseUrl || '').trim().replace(/\/+$/, '')
  const cleanTxId = sanitizeTxIdForExplorer(txid)
  if (!base || !cleanTxId) return ''
  const encoded = encodeURIComponent(cleanTxId)
  const normalizedNetworkId = normalizeActivityNetworkId(networkId).toLowerCase()

  if (normalizedNetworkId === 'tron') return `${base}/#/transaction/${encoded}`
  if (normalizedNetworkId === 'ada') return `${base}/transaction/${encoded}`
  return `${base}/tx/${encoded}`
}

export function buildActivitySelectionKey(txid: string, networkId: string): string {
  const normalizedTxid = String(txid || '').trim().toLowerCase()
  const normalizedNetworkId = normalizeActivityNetworkId(networkId).toLowerCase()
  return `${normalizedNetworkId}::${normalizedTxid}`
}
