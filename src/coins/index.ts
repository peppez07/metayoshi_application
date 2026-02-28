import { arrCoin } from './arr'
import { arbitrumCoin } from './arbitrum'
import { avaxcCoin } from './avaxc'
import { baseCoin } from './base'
import { bitcoinCoin } from './bitcoin'
import { cardanoCoin } from './cardano'
import { BTC_ADDRESS_SPEC } from './btc'
import { bnbCoin } from './bnb'
import { btczCoin } from './btcz'
import { cosmosCoin } from './cosmos'
import { dashCoin } from './dash'
import { dogeCoin } from './doge'
import { ethCoin } from './eth'
import { firoCoin } from './firo'
import { mantaAtlanticCoin } from './manta-atlantic'
import { moneroCoin } from './monero'
import { pivxCoin } from './pivx'
import { polkadotCoin } from './polkadot'
import { polygonCoin } from './polygon'
import { rtmCoin } from './rtm'
import { solCoin } from './sol'
import { terraClassicCoin } from './terra-classic'
import { terraCoin } from './terra'
import { tideCoin } from './tide'
import { tronCoin } from './tron'
import { xlmCoin } from './xlm'
import { xrpCoin } from './xrp'
import { SERVER_SCAFFOLD_COIN_MODULES, SERVER_SCAFFOLD_SERVER_ID_TO_NETWORK_ID } from './serverScaffoldCoins'
import type { CoinModule, CoinRuntimeContext, Network, UtxoAddressSpec } from './types'
import { BUILD_CONFIG } from '../buildConfig'

export type { CoinType, Network } from './types'
export { getCoinRuntimeProfile, type CoinRuntimeProfile } from './runtimeProfile'

const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '')
const APP_API_KEY = String((import.meta as any)?.env?.VITE_APP_API_KEY || '').trim()
const GLOBAL_BRIDGE_USER = String((import.meta as any)?.env?.VITE_BRIDGE_USER || '').trim()
const GLOBAL_BRIDGE_PASSWORD = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || '').trim()

if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL is required. Set it in your environment (for example .env.local).')
}

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

function uniqCoinModulesById(modules: CoinModule[]): CoinModule[] {
  const out: CoinModule[] = []
  const seen = new Set<string>()
  for (const mod of modules) {
    const id = String(mod?.id || '').trim()
    if (!id) continue
    if (seen.has(id)) continue
    seen.add(id)
    out.push(mod)
  }
  return out
}

const RAW_COIN_MODULES: CoinModule[] = [
  rtmCoin,
  ethCoin,
  bnbCoin,
  polygonCoin,
  arbitrumCoin,
  baseCoin,
  avaxcCoin,
  bitcoinCoin,
  cosmosCoin,
  dashCoin,
  pivxCoin,
  polkadotCoin,
  terraCoin,
  terraClassicCoin,
  mantaAtlanticCoin,
  solCoin,
  xlmCoin,
  tronCoin,
  dogeCoin,
  btczCoin,
  tideCoin,
  firoCoin,
  xrpCoin,
  arrCoin,
  moneroCoin,
  cardanoCoin,
  ...SERVER_SCAFFOLD_COIN_MODULES
]

export const ALL_COIN_MODULES: CoinModule[] = uniqCoinModulesById(RAW_COIN_MODULES)

const ALL_COIN_IDS = new Set(ALL_COIN_MODULES.map((coin) => coin.id))
const DISABLED_NETWORK_IDS = new Set<string>([
  'srv--cronos-pos'
])
const ALLOWED_COIN_IDS = new Set([...ALL_COIN_IDS].filter((id) => !DISABLED_NETWORK_IDS.has(id)))
const DEFAULT_ENABLED_COIN_IDS = [...ALLOWED_COIN_IDS]
const EVM_COIN_IDS = new Set<string>(['eth', 'bnb', 'polygon', 'arb', 'base', 'avaxc'])
const EVM_ETHEREUM_L2_COIN_IDS = new Set<string>(['polygon', 'arb', 'base'])
const EVM_CHAIN_ID_TO_COIN_ID: Record<number, string> = {
  1: 'eth',
  56: 'bnb',
  137: 'polygon',
  42161: 'arb',
  8453: 'base',
  43114: 'avaxc'
}
const CHAINLIST_EVM_ALIAS_TO_COIN_ID: Record<string, string> = {
  eth: 'eth',
  ethereum: 'eth',
  'ethereum-mainnet': 'eth',
  'mainnet-ethereum': 'eth',
  bnb: 'bnb',
  bsc: 'bnb',
  'bnb-smart-chain': 'bnb',
  'binance-smart-chain': 'bnb',
  'smart-chain': 'bnb',
  polygon: 'polygon',
  matic: 'polygon',
  'polygon-mainnet': 'polygon',
  'matic-mainnet': 'polygon',
  arb: 'arb',
  arbitrum: 'arb',
  'arbitrum-one': 'arb',
  base: 'base',
  'base-mainnet': 'base',
  avaxc: 'avaxc',
  avax: 'avaxc',
  avalanche: 'avaxc',
  'avalanche-c-chain': 'avaxc',
  'avalanche-mainnet-c-chain': 'avaxc'
}

function normalizeCoinSelectionToken(rawToken: string): string {
  return String(rawToken || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
}

function mapChainlistAliasToCoinId(rawToken: string): string | null {
  const normalized = normalizeCoinSelectionToken(rawToken)
  if (!normalized) return null
  const direct = CHAINLIST_EVM_ALIAS_TO_COIN_ID[normalized]
  if (direct) return direct
  if (/^eip155:\d+$/.test(normalized)) {
    const chainId = Number(normalized.slice('eip155:'.length))
    if (Number.isFinite(chainId) && chainId > 0) return EVM_CHAIN_ID_TO_COIN_ID[chainId] || null
  }
  if (/^\d+$/.test(normalized)) {
    const chainId = Number(normalized)
    if (Number.isFinite(chainId) && chainId > 0) return EVM_CHAIN_ID_TO_COIN_ID[chainId] || null
  }
  return null
}

function expandEnabledCoinSelectionToken(rawToken: string): string[] {
  const token = normalizeCoinSelectionToken(rawToken)
  if (!token) return []
  if (token === 'evm') return [...EVM_COIN_IDS]
  if (token === 'evm-l2' || token === 'eth-l2' || token === 'l2') return [...EVM_ETHEREUM_L2_COIN_IDS]
  if (token === 'evm-l1') return [...EVM_COIN_IDS].filter((id) => !EVM_ETHEREUM_L2_COIN_IDS.has(id))
  const chainlistMapped = mapChainlistAliasToCoinId(token)
  if (chainlistMapped) return [chainlistMapped]
  return [token]
}

function normalizeEnabledCoinIdTokens(rawTokens: string[]): string[] {
  const out: string[] = []
  for (const rawToken of rawTokens) {
    const expanded = expandEnabledCoinSelectionToken(rawToken)
    for (const id of expanded) {
      if (!id) continue
      if (!ALLOWED_COIN_IDS.has(id)) continue
      if (DISABLED_NETWORK_IDS.has(id)) continue
      out.push(id)
    }
  }
  return out
}

function parseEnabledCoinIdsFromBuildConfig(): Set<string> | null {
  const enabledRaw = BUILD_CONFIG.coins?.enabled
  const disabled = new Set((BUILD_CONFIG.coins?.disabled || []).map((id) => String(id || '').trim().toLowerCase()).filter(Boolean))

  if (!enabledRaw && disabled.size === 0) return null

  const base = (() => {
    if (!enabledRaw) return new Set(DEFAULT_ENABLED_COIN_IDS)
    if (enabledRaw === 'all' || enabledRaw === '*') return new Set(ALLOWED_COIN_IDS)
    if (Array.isArray(enabledRaw)) {
      const selected = normalizeEnabledCoinIdTokens(
        enabledRaw
          .map((v) => String(v || '').trim().toLowerCase())
          .filter(Boolean)
      )
      return selected.length > 0 ? new Set(selected) : new Set(DEFAULT_ENABLED_COIN_IDS)
    }
    return new Set(DEFAULT_ENABLED_COIN_IDS)
  })()

  for (const id of disabled) base.delete(id)
  return base.size > 0 ? base : new Set(DEFAULT_ENABLED_COIN_IDS)
}

function parseEnabledCoinIds(raw: string | undefined): Set<string> {
  const input = String(raw || '').trim().toLowerCase()
  if (!input) return new Set(DEFAULT_ENABLED_COIN_IDS)
  if (input === 'all' || input === '*') return new Set(ALLOWED_COIN_IDS)

  const selected = input
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean)

  const resolved = normalizeEnabledCoinIdTokens(selected)

  return resolved.length > 0 ? new Set(resolved) : new Set(DEFAULT_ENABLED_COIN_IDS)
}

export const ENABLED_NETWORK_IDS = new Set(
  [...(parseEnabledCoinIdsFromBuildConfig() ?? parseEnabledCoinIds(import.meta.env.VITE_ENABLED_COINS as string | undefined))]
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

function withGlobalBridgeCredentials(network: Network): Network {
  if (!GLOBAL_BRIDGE_USER || !GLOBAL_BRIDGE_PASSWORD) return network
  return {
    ...network,
    bridgeUsername: GLOBAL_BRIDGE_USER,
    bridgePassword: GLOBAL_BRIDGE_PASSWORD
  }
}

export const ALL_NETWORKS: Network[] = ALL_COIN_MODULES
  .map((coin) => coin.createNetwork(runtimeContext))
  .map(withGlobalBridgeCredentials)
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

type ServerCoinNetworkRow = {
  chain?: string
  rpcUrl?: string
  rpcWallet?: string
  rpcUser?: string
  isActive?: boolean
  metadata?: {
    provider?: string
    [key: string]: unknown
  }
}

type ServerCoinRow = {
  coinId?: string
  name?: string
  symbol?: string
  enabled?: boolean
  features?: { bridge?: boolean }
  methodGroups?: Record<string, string[]>
  networks?: ServerCoinNetworkRow[]
}

export type ServerCoinCatalogKind = 'main' | 'asset'

export type ServerCoinCatalogItem = {
  coinId: string
  name: string
  symbol: string
  kind: ServerCoinCatalogKind
  contractAddress?: string
  runtimeModelId: string | null
  appNetworkId: string | null
  chain: 'main' | 'test'
}

const TOKEN_MARKERS = new Set([
  'token',
  'erc20',
  'bep20',
  'trc20',
  'spl',
  'usdt',
  'usdc',
  'dai'
])

const TESTNET_ID_MARKERS = /(testnet|sepolia|hoodi|fuji|amoy|minato|blaze)/i
const BLOCKED_SERVER_COIN_IDS = new Set<string>([
  'cronos-pos',
  'manta-atlantic',
  'syscoin',
  'syscoin-evm',
  'syscoin-tanenbaum-evm'
])

function isBlockedTestnetLikeCoinId(coinId: string): boolean {
  const normalized = String(coinId || '').trim().toLowerCase()
  if (!normalized) return false
  return TESTNET_ID_MARKERS.test(normalized)
}

function isBlockedServerCoinId(coinId: string): boolean {
  const normalized = String(coinId || '').trim().toLowerCase()
  if (!normalized) return false
  return BLOCKED_SERVER_COIN_IDS.has(normalized) || isBlockedTestnetLikeCoinId(normalized)
}

function isLikelyTokenServerCoin(coin: ServerCoinRow): boolean {
  const coinId = String(coin?.coinId || '').trim().toLowerCase()
  const name = String(coin?.name || '').trim().toLowerCase()
  const symbol = String(coin?.symbol || '').trim().toLowerCase()
  const haystack = `${coinId} ${name} ${symbol}`

  if (/^0x[0-9a-f]{40}$/i.test(coinId)) return true
  if (coinId.includes('/token/') || coinId.includes('-token-') || coinId.endsWith('-token')) return true
  if (coinId.includes('contract')) return true

  for (const marker of TOKEN_MARKERS) {
    if (haystack.includes(marker)) return true
  }
  return false
}

const SERVER_COIN_TO_NETWORK_ID: Record<string, string> = {
  raptoreum: 'rtm',
  dogecoin: 'doge',
  bitcoinz: 'btcz',
  tidecoin: 'tide',
  firo: 'firo',
  xrp: 'xrp',
  arr: 'arr',
  cardano: 'ada',
  monero: 'xmr',
  stellar: 'xlm',
  xlm: 'xlm',
  ethereum: 'eth',
  'arbitrum-one': 'arb',
  'arbitrum-nova': 'arb',
  base: 'base',
  bsc: 'bnb',
  'polygon-bor': 'polygon',
  'avalanche-c-chain': 'avaxc',
  solana: 'sol',
  tron: 'tron',
  // Additional enabled server EVM chains mapped to app EVM runtime.
  blast: 'eth',
  berachain: 'eth',
  celo: 'eth',
  cronos: 'cro',
  fraxtal: 'eth',
  haqq: 'eth',
  mantle: 'eth',
  moonbeam: 'eth',
  moonriver: 'eth',
  'cronos-pos': 'cro',
  'avail': 'eth',
  'peaq': 'eth',
  'syscoin-tanenbaum-evm': 'eth',
  optimism: 'eth',
  pulsechain: 'eth',
  scroll: 'eth',
  somnia: 'eth',
  soneium: 'eth',
  sonic: 'eth',
  taiko: 'eth',
  unichain: 'eth',
  'tron-evm': 'eth'
}

const SERVER_SYMBOL_OVERRIDES: Record<string, string> = {
  bitcoin: 'BTC',
  'bitcoin-testnet': 'BTC'
}

const DEFAULT_BRIDGE_USER = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
const DEFAULT_BRIDGE_PASSWORD = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'

const FORCE_DOGE_UTXO_COMPAT_IDS = new Set([
  'bitcoin'
])

const FORCE_AVAXC_COMPAT_IDS = new Set([
  'avalanche-p-chain',
  'avalanche-x-chain'
])

const FORCE_POLYGON_COMPAT_IDS = new Set([
  'polygon-heimdall'
])

const FORCE_ETH_COMPAT_IDS = new Set([
  '0g',
  '0g-beacon',
  'akash',
  'analog',
  'asset-mantle',
  'atomone',
  'axelar',
  'babylon',
  'bitcanna',
  'bitway',
  'celer',
  'celestia',
  'cheqd',
  'chihuahua',
  'chiliz',
  'chiliz-spicy',
  'comdex',
  'coreum',
  'cosmos',
  'dora',
  'dydx',
  'elys',
  'fetch',
  'injective',
  'juno',
  'kujira',
  'kusama',
  'lava',
  'lumera',
  'manta-atlantic',
  'medibloc',
  'neutron',
  'nolus',
  'oraichain',
  'osmosis',
  'passage',
  'persistence',
  'polkadot',
  'quicksilver',
  'rebus',
  'regen',
  'rizon',
  'saga',
  'sentinel',
  'shentu',
  'sifchain',
  'stargaze',
  'stride',
  'teritori',
  'terra',
  'terra-classic'
])

function mapServerCoinIdToNetworkId(coinId: string): string | null {
  const normalized = String(coinId || '').trim().toLowerCase()
  const direct = SERVER_COIN_TO_NETWORK_ID[normalized]
  if (direct) return direct
  const scaffoldMapped = SERVER_SCAFFOLD_SERVER_ID_TO_NETWORK_ID[normalized]
  if (scaffoldMapped) return scaffoldMapped

  // Pattern mapping for additional server coin IDs.
  if (normalized === 'ethereum-holesky') return 'eth'
  if (normalized === 'opbnb' || normalized.startsWith('opbnb-')) return 'bnb'
  if (normalized === 'bsc') return 'bnb'
  if (normalized === 'polygon' || normalized === 'polygon-bor') return 'polygon'
  if (normalized.startsWith('avalanche-') && normalized.includes('c-chain')) return 'avaxc'
  if (normalized === 'solana') return 'sol'
  if (normalized === 'tron') return 'tron'
  if (normalized === 'tron-evm') return 'eth'
  if (normalized === 'optimism') return 'base'
  if (normalized === 'blast' || normalized.startsWith('blast-')) return 'eth'
  if (normalized === 'berachain' || normalized.startsWith('berachain-')) return 'eth'
  if (normalized === 'celo' || normalized.startsWith('celo-')) return 'eth'
  if (normalized === 'cronos' || normalized.startsWith('cronos-')) return 'cro'
  if (normalized === 'fraxtal' || normalized.startsWith('fraxtal-')) return 'eth'
  if (normalized === 'haqq' || normalized.startsWith('haqq-')) return 'eth'
  if (normalized === 'linea') return 'eth'
  if (normalized === 'mantle' || normalized.startsWith('mantle-')) return 'eth'
  if (normalized === 'metis') return 'eth'
  if (normalized === 'moonbeam' || normalized.startsWith('moonbeam-')) return 'eth'
  if (normalized === 'moonriver' || normalized.startsWith('moonriver-')) return 'eth'
  if (normalized === 'pulsechain' || normalized.startsWith('pulsechain-')) return 'eth'
  if (normalized === 'scroll' || normalized.startsWith('scroll-')) return 'eth'
  if (normalized === 'somnia' || normalized.startsWith('somnia-')) return 'eth'
  if (normalized === 'taiko') return 'eth'
  if (normalized === 'unichain') return 'base'
  if (normalized === 'soneium' || normalized.startsWith('soneium-')) return 'eth'
  if (normalized === 'sonic' || normalized.startsWith('sonic-')) return 'eth'
  // Forced compatibility mappings:
  // These chains have dedicated app modules missing, so we force them through
  // the existing EVM runtime model for bridge-based connectivity.
  if (normalized === 'evmos' || normalized.startsWith('evmos-')) return 'eth'
  if (normalized === 'dymension' || normalized.startsWith('dymension-')) return 'eth'
  if (normalized === 'kava' || normalized.startsWith('kava-')) return 'eth'
  if (normalized === 'iris' || normalized.startsWith('iris-')) return 'eth'
  if (normalized === 'nibiru' || normalized.startsWith('nibiru-')) return 'eth'
  if (normalized === 'tenet' || normalized.startsWith('tenet-')) return 'eth'
  if (normalized === 'xpla' || normalized.startsWith('xpla-')) return 'eth'
  if (normalized === 'warden' || normalized.startsWith('warden-')) return 'eth'
  if (normalized === 'syscoin-evm' || normalized.startsWith('syscoin-')) return 'eth'
  if (normalized === 'xpla-evm' || normalized.startsWith('xpla-evm')) return 'eth'
  if (normalized === 'sei-evm' || normalized.startsWith('sei-evm')) return 'eth'
  if (normalized === 'nibiru-evm' || normalized.startsWith('nibiru-evm')) return 'eth'
  if (normalized === 'haqq-evm' || normalized.startsWith('haqq-evm')) return 'eth'
  if (normalized === 'iris-evm' || normalized.startsWith('iris-evm')) return 'eth'
  if (normalized === 'kava-evm' || normalized.startsWith('kava-evm')) return 'eth'
  if (normalized === 'cronos-evm' || normalized.startsWith('cronos-evm')) return 'eth'
  if (normalized === 'tenet-evm' || normalized.startsWith('tenet-evm')) return 'eth'
  if (normalized === 'dymension-evm' || normalized.startsWith('dymension-evm')) return 'eth'
  if (normalized === 'evmos-evm' || normalized.startsWith('evmos-evm')) return 'eth'
  if (normalized === 'warden-evm' || normalized.startsWith('warden-evm')) return 'eth'
  if (FORCE_DOGE_UTXO_COMPAT_IDS.has(normalized)) return 'doge'
  if (FORCE_AVAXC_COMPAT_IDS.has(normalized)) return 'avaxc'
  if (FORCE_POLYGON_COMPAT_IDS.has(normalized)) return 'polygon'
  if (FORCE_ETH_COMPAT_IDS.has(normalized)) return 'eth'

  return null
}

function resolveActiveServerNetwork(networks: ServerCoinNetworkRow[] | undefined): ServerCoinNetworkRow | null {
  const rows = Array.isArray(networks) ? networks.filter((n) => n && n.isActive !== false) : []
  if (rows.length === 0) return null
  const main = rows.find((n) => String(n.chain || '').trim().toLowerCase() === 'main')
  return main || rows[0] || null
}

function safeHost(value: string): string {
  try {
    return new URL(value).hostname.toLowerCase()
  } catch {
    return ''
  }
}

function isLoopbackOrPrivateHost(value: string): boolean {
  const host = safeHost(value)
  if (!host) return false
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true
  if (host.startsWith('10.')) return true
  if (host.startsWith('192.168.')) return true
  if (host.startsWith('172.16.') || host.startsWith('172.17.') || host.startsWith('172.18.') || host.startsWith('172.19.')) return true
  if (host.startsWith('172.2')) return true
  return false
}

function isPublicnodeNetworkRow(row: ServerCoinNetworkRow): boolean {
  const provider = String(row?.metadata?.provider || '').trim().toLowerCase()
  if (provider === 'publicnode') return true
  const url = String(row?.rpcUrl || '').trim().toLowerCase()
  return url.includes('publicnode.com')
}

type NetworkCandidate = {
  appNetworkId: string
  network: Network
  chain: 'main' | 'test'
  isPublicnode: boolean
}

const EVM_MODEL_NETWORK_IDS = new Set(['eth', 'arb', 'base', 'bnb', 'polygon', 'avaxc'])
function flattenServerMethodGroups(methodGroups: Record<string, string[]> | undefined): string[] {
  if (!methodGroups || typeof methodGroups !== 'object') return []
  const out: string[] = []
  for (const methods of Object.values(methodGroups)) {
    if (!Array.isArray(methods)) continue
    for (const method of methods) {
      const normalized = String(method || '').trim().toLowerCase()
      if (normalized) out.push(normalized)
    }
  }
  return out
}

function supportsEvmBridgeMethods(methodGroups: Record<string, string[]> | undefined): boolean {
  const methods = flattenServerMethodGroups(methodGroups)
  if (methods.length === 0) return false
  return methods.some((m) => m.startsWith('eth_') || m === 'web3_clientversion' || m === 'net_version')
}

function inferBridgeCapabilities(
  coinId: string,
  modelNetworkId: string | null,
  methodGroups: Record<string, string[]> | undefined
): Network['capabilities'] {
  const methods = new Set(flattenServerMethodGroups(methodGroups))
  const isEvmModel = Boolean(modelNetworkId && EVM_MODEL_NETWORK_IDS.has(modelNetworkId))
  const isRtm = coinId === 'raptoreum'
  const isCardano = coinId === 'cardano' || modelNetworkId === 'ada'

  const canSendCoin =
    methods.has('sendtoaddress')
    || methods.has('sendmany')
    || methods.has('eth_sendrawtransaction')
    || methods.has('submit')

  const assetLayer = isEvmModel || isRtm || isCardano
  const assetSend = isEvmModel || isRtm || isCardano || methods.has('sendasset')

  return {
    features: {
      nativeSend: canSendCoin,
      assetLayer,
      assetSend: assetLayer && assetSend,
      activity: true
    },
    ui: {
      showAssetsTab: assetLayer,
      showAssetsAction: assetLayer,
      showSendAction: canSendCoin,
      showActivityTab: true
    }
  }
}

function mergeCapabilityInputs(
  baseCaps: Network['capabilities'] | undefined,
  inferredCaps: Network['capabilities'] | undefined
): Network['capabilities'] {
  const baseFeatures = baseCaps?.features || {}
  const baseUi = baseCaps?.ui || {}
  const inferredFeatures = inferredCaps?.features || {}
  const inferredUi = inferredCaps?.ui || {}

  const nativeSend = Boolean(baseFeatures.nativeSend || inferredFeatures.nativeSend)
  const assetLayer = Boolean(baseFeatures.assetLayer || inferredFeatures.assetLayer)
  const assetSend = Boolean(baseFeatures.assetSend || inferredFeatures.assetSend)
  const activity = Boolean(
    (baseFeatures.activity ?? true) || (inferredFeatures.activity ?? true)
  )

  return {
    features: {
      nativeSend,
      assetLayer,
      assetSend,
      activity
    },
    ui: {
      showAssetsTab: Boolean(baseUi.showAssetsTab || inferredUi.showAssetsTab || assetLayer),
      showAssetsAction: Boolean(baseUi.showAssetsAction || inferredUi.showAssetsAction || assetLayer),
      showSendAction: Boolean(baseUi.showSendAction || inferredUi.showSendAction || nativeSend),
      showActivityTab: Boolean((baseUi.showActivityTab ?? true) || (inferredUi.showActivityTab ?? true))
    }
  }
}

function isNetworkSpendable(network: Network): boolean {
  if (network.derivation?.status === 'unsupported') return false
  return network.capabilities?.features?.nativeSend === true
}

function scoreCandidate(candidate: NetworkCandidate): number {
  const rpcUrl = String(candidate.network.rpcUrl || '').trim().toLowerCase()
  const isHttps = rpcUrl.startsWith('https://')
  const isLocal = isLoopbackOrPrivateHost(rpcUrl)
  let score = 0
  if (candidate.isPublicnode) score += 120
  if (candidate.chain === 'main') score += 40
  if (isHttps) score += 20
  if (!isLocal) score += 15
  if (candidate.chain === 'test') score -= 10
  if (isLocal) score -= 25
  return score
}

function resolveBridgeUrlForNetwork(
  networkId: string,
  coinId: string,
  chain: 'main' | 'test',
  rpcWallet: string | undefined
): string {
  if (networkId === 'cro') {
    return `${API_BASE_URL}/v1/bridge/cronos-pos/${chain}`
  }
  if (networkId === 'rtm' || networkId === 'xrp') {
    const wallet = String(rpcWallet || '').trim() || 'mainwallet'
    return `${API_BASE_URL}/v1/bridge/${coinId}/${chain}/wallet/${encodeURIComponent(wallet)}`
  }
  return `${API_BASE_URL}/v1/bridge/${coinId}/${chain}`
}

function createGenericServerNetwork(input: {
  coinId: string
  coin: ServerCoinRow
  chain: 'main' | 'test'
  selectedNetwork?: ServerCoinNetworkRow | null
}): Network {
  const suffix = sanitizeServerCoinId(input.coinId) || 'unknown'
  const symbol = normalizeServerCoinSymbol(
    input.coinId,
    String(input.coin.symbol || '').trim(),
    suffix.slice(0, 6)
  )
  const rpcWallet = String(input.selectedNetwork?.rpcWallet || '').trim()
  return {
    id: `generic--${suffix}`,
    runtimeModelId: 'generic',
    serverCoinId: input.coinId,
    serverChain: input.chain,
    name: String(input.coin.name || input.coinId).trim() || input.coinId,
    symbol,
    coinType: 'BTC',
    coinSymbol: symbol,
    rpcUrl: String(input.selectedNetwork?.rpcUrl || '').trim() || API_BASE_URL,
    rpcWallet: rpcWallet || '',
    rpcUsername: String(input.selectedNetwork?.rpcUser || '').trim(),
    rpcPassword: '',
    bridgeUrl: `${API_BASE_URL}/v1/bridge/${input.coinId}/${input.chain}`,
    bridgeUsername: DEFAULT_BRIDGE_USER,
    bridgePassword: DEFAULT_BRIDGE_PASSWORD,
    derivation: {
      status: 'unsupported',
      reason: `${input.coinId} address derivation is not supported in this build`
    },
    capabilities: {
      features: { nativeSend: false, assetLayer: false, assetSend: false, activity: true },
      ui: { showAssetsTab: false, showAssetsAction: false, showSendAction: false, showActivityTab: true }
    }
  }
}

function sanitizeServerCoinId(coinId: string): string {
  return String(coinId || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const ETHEREUM_L2_SERVER_COIN_IDS = new Set<string>([
  'arbitrum-one',
  'arbitrum-nova',
  'base',
  'blast',
  'fraxtal',
  'linea',
  'mantle',
  'metis',
  'optimism',
  'scroll',
  'soneium',
  'taiko',
  'unichain'
])

const SERVER_COIN_VARIANT_SUFFIXES = [
  'testnet',
  'sepolia',
  'holesky',
  'hoodi',
  'fuji',
  'amoy',
  'minato',
  'blaze',
  'spicy',
  'tanenbaum'
]

function stripServerCoinVariantSuffix(coinId: string): string {
  const normalized = String(coinId || '').trim().toLowerCase()
  if (!normalized) return ''
  for (const suffix of SERVER_COIN_VARIANT_SUFFIXES) {
    const token = `-${suffix}`
    if (normalized.endsWith(token)) return normalized.slice(0, -token.length)
  }
  return normalized
}

function isEthereumLayer2ServerCoinId(coinId: string): boolean {
  const baseId = stripServerCoinVariantSuffix(coinId)
  return ETHEREUM_L2_SERVER_COIN_IDS.has(baseId)
}

function normalizeServerCoinSymbol(coinId: string, symbol: string, fallback?: string): string {
  const normalizedCoinId = String(coinId || '').trim().toLowerCase()
  const override = SERVER_SYMBOL_OVERRIDES[normalizedCoinId]
  if (override) return override
  const normalized = String(symbol || '').trim().toUpperCase()
  if (normalized) return normalized
  return String(fallback || '').trim().toUpperCase()
}

function resolveAppNetworkId(baseNetworkId: string, serverCoinId: string): string {
  const normalizedBaseNetworkId = String(baseNetworkId || '').trim().toLowerCase()
  const normalizedServerCoinId = stripServerCoinVariantSuffix(serverCoinId)
  if (normalizedBaseNetworkId.startsWith('srv--')) {
    const parts = normalizedBaseNetworkId.split('--')
    if (parts.length >= 2 && parts[1]) return `srv--${parts[1]}`
    return normalizedBaseNetworkId
  }

  // Avoid collisions when multiple distinct server chains are forced through the same
  // runtime model (common for Ethereum L2s and EVM lookalikes). Collisions would cause
  // one chain to hide another during server-registry sync (candidates are keyed by id).
  if (EVM_MODEL_NETWORK_IDS.has(normalizedBaseNetworkId)) {
    const canonicalServerIdByModel: Record<string, string> = {
      eth: 'ethereum',
      arb: 'arbitrum-one',
      base: 'base',
      bnb: 'bsc',
      polygon: 'polygon-bor',
      avaxc: 'avalanche-c-chain'
    }

    const canonicalServerId = canonicalServerIdByModel[normalizedBaseNetworkId]
    if (canonicalServerId && normalizedServerCoinId === canonicalServerId) {
      return normalizedBaseNetworkId
    }

    if (isEthereumLayer2ServerCoinId(normalizedServerCoinId)) {
      return `eth-l2--${sanitizeServerCoinId(normalizedServerCoinId)}`
    }

    return `${normalizedBaseNetworkId}--${sanitizeServerCoinId(normalizedServerCoinId)}`
  }

  return normalizedBaseNetworkId
}

function validateEthereumLayer2NetworkIdMapping(): void {
  const seen = new Map<string, string>()
  for (const serverCoinId of ETHEREUM_L2_SERVER_COIN_IDS) {
    const model = mapServerCoinIdToNetworkId(serverCoinId) || 'eth'
    const appNetworkId = resolveAppNetworkId(model, serverCoinId)
    const existing = seen.get(appNetworkId)
    if (existing && existing !== serverCoinId) {
      throw new Error(
        `Duplicate appNetworkId "${appNetworkId}" for Ethereum L2 server coin IDs: "${existing}" and "${serverCoinId}".`
      )
    }
    seen.set(appNetworkId, serverCoinId)
  }
}

validateEthereumLayer2NetworkIdMapping()

function inferRuntimeModelFromTokenLikeCoinId(coinId: string): string | null {
  const normalized = String(coinId || '').trim().toLowerCase()
  if (!normalized) return null
  if (normalized.includes('arbitrum')) return 'arb'
  if (normalized.includes('polygon')) return 'polygon'
  if (normalized.includes('avalanche')) return 'avaxc'
  if (normalized.includes('base')) return 'base'
  if (normalized.includes('bsc') || normalized.includes('bnb')) return 'bnb'
  if (normalized.includes('ethereum') || normalized.includes('eth')) return 'eth'
  if (normalized.includes('solana') || normalized.includes('spl')) return 'sol'
  if (normalized.includes('tron') || normalized.includes('trc20')) return 'tron'
  return null
}

function buildServerCoinCatalog(coins: ServerCoinRow[]): ServerCoinCatalogItem[] {
  const findHexAddressInValue = (value: unknown): string => {
    const text = String(value ?? '').trim()
    const m = text.match(/0x[a-fA-F0-9]{40}/)
    return m ? m[0] : ''
  }
  const findContractAddress = (coin: ServerCoinRow): string => {
    const direct = findHexAddressInValue(coin.coinId) || findHexAddressInValue(coin.name)
    if (direct) return direct
    const networks = Array.isArray(coin.networks) ? coin.networks : []
    for (const row of networks) {
      const metadata = row?.metadata && typeof row.metadata === 'object' ? row.metadata : null
      if (!metadata) continue
      for (const value of Object.values(metadata)) {
        const fromMeta = findHexAddressInValue(value)
        if (fromMeta) return fromMeta
      }
    }
    return ''
  }

  const out: ServerCoinCatalogItem[] = []
  for (const coin of coins) {
    if (!coin?.enabled) continue
    if (coin?.features?.bridge === false) continue
    const coinId = String(coin.coinId || '').trim().toLowerCase()
    if (!coinId) continue
    if (isBlockedServerCoinId(coinId)) continue

    const selectedNetwork = resolveActiveServerNetwork(coin.networks)
    const chain = String(selectedNetwork?.chain || 'main').trim().toLowerCase() === 'test' ? 'test' : 'main'
    const tokenLike = isLikelyTokenServerCoin(coin)
    const mappedModel = mapServerCoinIdToNetworkId(coinId)
    const runtimeModelId = tokenLike ? (inferRuntimeModelFromTokenLikeCoinId(coinId) || mappedModel) : mappedModel
    const appNetworkId = runtimeModelId
      ? (tokenLike ? runtimeModelId : resolveAppNetworkId(runtimeModelId, coinId))
      : null

    out.push({
      coinId,
      name: String(coin.name || coinId).trim() || coinId,
      symbol: normalizeServerCoinSymbol(coinId, String(coin.symbol || '').trim()),
      kind: tokenLike ? 'asset' : 'main',
      contractAddress: tokenLike ? (findContractAddress(coin) || undefined) : undefined,
      runtimeModelId: runtimeModelId || null,
      appNetworkId,
      chain
    })
  }

  return out.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'main' ? -1 : 1
    const left = `${a.name}|${a.coinId}`.toLowerCase()
    const right = `${b.name}|${b.coinId}`.toLowerCase()
    return left.localeCompare(right)
  })
}

export async function loadServerRegistrySnapshot(): Promise<{
  networks: Network[] | null
  catalog: ServerCoinCatalogItem[]
}> {
  const headers: Record<string, string> = {}
  if (APP_API_KEY) headers['X-API-Key'] = APP_API_KEY
  const response = await fetch(`${API_BASE_URL}/v1/coins`, { method: 'GET', headers })
  if (!response.ok) {
    throw new Error(`Server coin registry fetch failed: HTTP ${response.status}`)
  }
  const json = await response.json().catch(() => null)
  const coins = Array.isArray(json?.coins) ? (json.coins as ServerCoinRow[]) : []
  if (coins.length === 0) return { networks: null, catalog: [] }
  const catalog = buildServerCoinCatalog(coins)
  const spendableMainCoinIds = new Set<string>()
  const moduleById = new Map<string, Network>(ALL_NETWORKS.map((n) => [n.id, n]))
  const candidatesByAppNetworkId = new Map<string, NetworkCandidate[]>()
  for (const coin of coins) {
    if (!coin?.enabled) continue
    if (coin?.features?.bridge === false) continue
    const coinId = String(coin.coinId || '').trim().toLowerCase()
    if (!coinId) continue
    if (isBlockedServerCoinId(coinId)) continue
    if (isLikelyTokenServerCoin(coin)) continue
    const modelNetworkId = mapServerCoinIdToNetworkId(coinId)
    const selectedNetwork = resolveActiveServerNetwork(coin.networks)
    const chain = String(selectedNetwork?.chain || 'main').trim().toLowerCase() === 'test' ? 'test' : 'main'
    const rpcWallet = String(selectedNetwork?.rpcWallet || '').trim()

    const canUseMappedModel = Boolean(
      modelNetworkId
      && moduleById.get(modelNetworkId)
      && (!EVM_MODEL_NETWORK_IDS.has(modelNetworkId) || supportsEvmBridgeMethods(coin.methodGroups))
    )

    if (canUseMappedModel && modelNetworkId) {
      const base = moduleById.get(modelNetworkId)!
      const appNetworkId = resolveAppNetworkId(modelNetworkId, coinId)
      const inferredCapabilities = inferBridgeCapabilities(coinId, modelNetworkId, coin.methodGroups)
      const mergedCapabilities = mergeCapabilityInputs(base.capabilities, inferredCapabilities)
      const mappedNetwork: Network = {
        ...base,
        id: appNetworkId,
        runtimeModelId: String(base.runtimeModelId || modelNetworkId || '').trim() || undefined,
        serverCoinId: coinId,
        serverChain: chain,
        name: String(coin.name || base.name).trim() || base.name,
        symbol: normalizeServerCoinSymbol(coinId, String(coin.symbol || '').trim(), base.symbol) || base.symbol,
        rpcUrl: String(selectedNetwork?.rpcUrl || base.rpcUrl).trim() || base.rpcUrl,
        rpcWallet: rpcWallet || base.rpcWallet || '',
        rpcUsername: String(selectedNetwork?.rpcUser || base.rpcUsername || '').trim(),
        bridgeUrl: resolveBridgeUrlForNetwork(modelNetworkId, coinId, chain, rpcWallet),
        // Always use runtime-configured bridge credentials for server-synced networks.
        // Base modules may contain placeholder defaults (e.g. "bridgepass").
        bridgeUsername: DEFAULT_BRIDGE_USER,
        bridgePassword: DEFAULT_BRIDGE_PASSWORD,
        capabilities: mergedCapabilities
      }
      if (!isNetworkSpendable(mappedNetwork)) continue
      const row = candidatesByAppNetworkId.get(appNetworkId) || []
      row.push({
        appNetworkId,
        network: mappedNetwork,
        chain,
        isPublicnode: selectedNetwork ? isPublicnodeNetworkRow(selectedNetwork) : false
      })
      candidatesByAppNetworkId.set(appNetworkId, row)
      spendableMainCoinIds.add(coinId)
      continue
    }

    // Fallback: keep server-listed chain visible in app as a generic model network
    // when no compatible runtime model mapping exists yet.
    const genericNetwork = createGenericServerNetwork({
      coinId,
      coin,
      chain,
      selectedNetwork
    })
    if (!isNetworkSpendable(genericNetwork)) continue
    const row = candidatesByAppNetworkId.get(genericNetwork.id) || []
    row.push({
      appNetworkId: genericNetwork.id,
      network: genericNetwork,
      chain,
      isPublicnode: selectedNetwork ? isPublicnodeNetworkRow(selectedNetwork) : false
    })
    candidatesByAppNetworkId.set(genericNetwork.id, row)
  }

  if (candidatesByAppNetworkId.size === 0) {
    const filteredCatalog = catalog.filter((item) => item.kind !== 'main' || spendableMainCoinIds.has(item.coinId))
    return {
      networks: null,
      catalog: filteredCatalog
    }
  }

  const bestByNetworkId = new Map<string, Network>()
  for (const [appNetworkId, rows] of candidatesByAppNetworkId.entries()) {
    if (!rows || rows.length === 0) continue
    const sorted = [...rows].sort((a, b) => scoreCandidate(b) - scoreCandidate(a))
    bestByNetworkId.set(appNetworkId, sorted[0].network)
  }

  const selectedIds = new Set(bestByNetworkId.keys())
  const canonical = ALL_NETWORKS.filter((n) => selectedIds.has(n.id)).map((n) => (
    bestByNetworkId.get(n.id) || n
  ))
  const extra = [...bestByNetworkId.values()]
    .filter((n) => !ALL_COIN_IDS.has(n.id))
    .sort((a, b) => {
      const left = `${a.name}|${a.id}`.toLowerCase()
      const right = `${b.name}|${b.id}`.toLowerCase()
      return left.localeCompare(right)
    })
  const ordered = [...canonical, ...extra]
  const mustKeepNetworkIds = new Set<string>(['doge', 'eth'])
  const withRequired = [...ordered]
  for (const requiredId of mustKeepNetworkIds) {
    if (withRequired.some((n) => n.id === requiredId)) continue
    const fallback = ALL_NETWORKS.find((n) => n.id === requiredId)
    if (fallback) withRequired.push(fallback)
  }
  const filteredCatalog = catalog.filter((item) => item.kind !== 'main' || spendableMainCoinIds.has(item.coinId))
  return {
    networks: withRequired.length > 0 ? withRequired : null,
    catalog: filteredCatalog
  }
}

export async function loadNetworksFromServerRegistry(): Promise<Network[] | null> {
  const snapshot = await loadServerRegistrySnapshot()
  return snapshot.networks
}
