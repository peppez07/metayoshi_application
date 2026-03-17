const STABLE_NETWORK_IDS = new Set(['rtm', 'eth', 'dash', 'btcz', 'firo', 'zec'])

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
  if (lower === 'ada' || lower === 'cardano') return 'ada'
  if (lower === 'arb' || lower === 'arbitrum' || lower === 'arbitrum-one') return 'arb'
  if (lower === 'aurora' || lower === 'aurora-mainnet') return 'aurora'
  if (lower === 'bahamut' || lower === 'bahamut-mainnet' || lower === 'ftn') return 'bahamut'
  if (lower === 'base' || lower === 'base-mainnet' || lower === 'base-chain') return 'base'
  if (lower === 'bsc' || lower === 'binance-smart-chain' || lower === 'bnb-smart-chain') return 'bnb'
  if (lower === 'bsc-testnet' || lower === 'binance-smart-chain-testnet' || lower === 'bnb-smart-chain-testnet') return 'bnb-testnet'
  if (lower === 'doge' || lower === 'dogecoin') return 'doge'
  if (lower === 'zec' || lower === 'zcash') return 'zec'
  if (lower === 'gnosis' || lower === 'gnosis-chain' || lower === 'xdai') return 'gnosis'
  if (lower === 'op' || lower === 'optimism' || lower === 'eth-l2--optimism') return 'op'
  if (lower === 'trx' || lower === 'tron') return 'tron'
  if (lower === 'xlm' || lower === 'stellar') return 'xlm'
  if (lower === 'avax' || lower === 'avaxc' || lower === 'avalanche' || lower === 'avalanche-c-chain') return 'avaxc'
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
