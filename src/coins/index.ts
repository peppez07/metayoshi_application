import { BTC_ADDRESS_SPEC } from './btc'
import { btczCoin } from './btcz'
import { dogeCoin } from './doge'
import { firoCoin } from './firo'
import { rtmCoin } from './rtm'
import { tideCoin } from './tide'
import type { CoinModule, CoinRuntimeContext, Network, UtxoAddressSpec } from './types'

export type { CoinType, Network } from './types'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://rtm.metayoshi.app').trim().replace(/\/+$/, '')

export function buildBridgeUrl(coin: string, chain: 'main' | 'test', wallet?: string): string {
  const base = `${API_BASE_URL}/v1/bridge/${coin}/${chain}`
  return wallet ? `${base}/wallet/${encodeURIComponent(wallet)}` : base
}

const runtimeContext: CoinRuntimeContext = {
  apiBaseUrl: API_BASE_URL,
  buildBridgeUrl
}

export const DEFAULT_NETWORK_ID = 'rtm'
export const DEFAULT_UTXO_COIN_SYMBOL = 'RTM'

export const ALL_COIN_MODULES: CoinModule[] = [
  rtmCoin,
  dogeCoin,
  btczCoin,
  tideCoin,
  firoCoin
]

const ALL_COIN_IDS = new Set(ALL_COIN_MODULES.map((coin) => coin.id))
// Public Chrome Web Store build policy (current release):
// keep only RTM enabled until BTCZ/FIRO QA is complete.
const DISABLED_NETWORK_IDS = new Set(['doge', 'tide', 'firo'])
const DEFAULT_ENABLED_COIN_IDS = ['rtm','btcz']

function parseEnabledCoinIds(raw: string | undefined): Set<string> {
  const input = String(raw || '').trim().toLowerCase()
  if (!input) return new Set(DEFAULT_ENABLED_COIN_IDS)
  if (input === 'all' || input === '*') return new Set(ALL_COIN_IDS)

  const selected = input
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .filter((id) => ALL_COIN_IDS.has(id))
    .filter((id) => !DISABLED_NETWORK_IDS.has(id))

  return selected.length > 0 ? new Set(selected) : new Set(DEFAULT_ENABLED_COIN_IDS)
}

export const ENABLED_NETWORK_IDS = new Set(
  [...parseEnabledCoinIds(import.meta.env.VITE_ENABLED_COINS as string | undefined)]
    .filter((id) => !DISABLED_NETWORK_IDS.has(id))
)

const MODULE_BY_NETWORK_ID = new Map<string, CoinModule>(
  ALL_COIN_MODULES.map((coin) => [coin.id, coin])
)

const UTXO_ADDRESS_SPECS: Record<string, UtxoAddressSpec> = {}
UTXO_ADDRESS_SPECS.BTC = BTC_ADDRESS_SPEC
for (const coin of ALL_COIN_MODULES) {
  if (!coin.coinSymbol || !coin.utxoAddress) continue
  const symbol = coin.coinSymbol.toUpperCase()
  if (!UTXO_ADDRESS_SPECS[symbol]) {
    UTXO_ADDRESS_SPECS[symbol] = coin.utxoAddress
  }
}

export const ALL_NETWORKS: Network[] = ALL_COIN_MODULES.map((coin) => coin.createNetwork(runtimeContext))
export const INITIAL_NETWORKS: Network[] = ALL_NETWORKS.filter((network) => ENABLED_NETWORK_IDS.has(network.id))

export const DEFAULT_ACTIVE_NETWORK_ID =
  INITIAL_NETWORKS.find((n) => n.id === (import.meta.env.VITE_DEFAULT_NETWORK ?? DEFAULT_NETWORK_ID))?.id
  ?? INITIAL_NETWORKS[0]?.id
  ?? DEFAULT_NETWORK_ID

export function getUtxoAddressSpec(coinSymbol: string): UtxoAddressSpec | undefined {
  return UTXO_ADDRESS_SPECS[coinSymbol.toUpperCase()]
}

export function getAllUtxoAddressSpecs(): Record<string, UtxoAddressSpec> {
  return { ...UTXO_ADDRESS_SPECS }
}

export function estimateNetworkFee(networkId: string, txBytes: number): number | undefined {
  const module = MODULE_BY_NETWORK_ID.get(networkId)
  return module?.estimateFee ? module.estimateFee(txBytes) : undefined
}
