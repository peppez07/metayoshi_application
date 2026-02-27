import { arrCoin } from './arr'
import { arbitrumCoin } from './arbitrum'
import { avaxcCoin } from './avaxc'
import { baseCoin } from './base'
import { cardanoCoin } from './cardano'
import { BTC_ADDRESS_SPEC } from './btc'
import { bnbCoin } from './bnb'
import { btczCoin } from './btcz'
import { dogeCoin } from './doge'
import { ethCoin } from './eth'
import { firoCoin } from './firo'
import { moneroCoin } from './monero'
import { polygonCoin } from './polygon'
import { rtmCoin } from './rtm'
import { solCoin } from './sol'
import { tideCoin } from './tide'
import { tronCoin } from './tron'
import { xlmCoin } from './xlm'
import { xrpCoin } from './xrp'
import { SERVER_SCAFFOLD_COIN_MODULES, SERVER_SCAFFOLD_SERVER_ID_TO_NETWORK_ID } from './serverScaffoldCoins'
import type { CoinModule, CoinRuntimeContext, Network, UtxoAddressSpec } from './types'

export type { CoinType, Network } from './types'
export { getCoinRuntimeProfile, type CoinRuntimeProfile } from './runtimeProfile'

const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '')
const APP_API_KEY = String((import.meta as any)?.env?.VITE_APP_API_KEY || '').trim()

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

export const ALL_COIN_MODULES: CoinModule[] = [
  rtmCoin,
  ethCoin,
  bnbCoin,
  polygonCoin,
  arbitrumCoin,
  baseCoin,
  avaxcCoin,
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

const ALL_COIN_IDS = new Set(ALL_COIN_MODULES.map((coin) => coin.id))
const DISABLED_NETWORK_IDS = new Set<string>()
const DEFAULT_ENABLED_COIN_IDS = [...ALL_COIN_IDS]

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
  'ethereum-sepolia': 'eth',
  'ethereum-hoodi': 'eth',
  'arbitrum-one': 'arb',
  'arbitrum-nova': 'arb',
  'arbitrum-sepolia': 'arb',
  base: 'base',
  'base-sepolia': 'base',
  bsc: 'bnb',
  'bsc-testnet': 'bnb',
  'polygon-bor': 'polygon',
  'polygon-amoy-bor': 'polygon',
  'avalanche-c-chain': 'avaxc',
  'avalanche-fuji-c-chain': 'avaxc',
  solana: 'sol',
  'solana-testnet': 'sol',
  tron: 'tron',
  // Additional enabled server EVM chains mapped to app EVM runtime.
  blast: 'eth',
  berachain: 'eth',
  celo: 'eth',
  cronos: 'eth',
  fraxtal: 'eth',
  haqq: 'eth',
  mantle: 'eth',
  moonbeam: 'eth',
  moonriver: 'eth',
  'cronos-pos': 'eth',
  'avail': 'eth',
  'peaq': 'eth',
  'dymension-testnet': 'eth',
  'dymension-testnet-evm': 'eth',
  'evmos-testnet': 'eth',
  'evmos-testnet-evm': 'eth',
  'fraxtal-hoodi': 'eth',
  'opbnb-testnet': 'bnb',
  'pulsechain-testnet': 'eth',
  'scroll-sepolia': 'eth',
  'soneium-minato': 'eth',
  'sonic-blaze': 'eth',
  'syscoin-tanenbaum-evm': 'eth',
  optimism: 'base',
  pulsechain: 'eth',
  scroll: 'eth',
  somnia: 'eth',
  soneium: 'eth',
  sonic: 'eth',
  taiko: 'eth',
  unichain: 'base',
  'tron-evm': 'eth'
}

const DEFAULT_BRIDGE_USER = String((import.meta as any)?.env?.VITE_BRIDGE_USER || 'bridgeuser').trim() || 'bridgeuser'
const DEFAULT_BRIDGE_PASSWORD = String((import.meta as any)?.env?.VITE_BRIDGE_PASSWORD || 'bridgepass').trim() || 'bridgepass'

const FORCE_DOGE_UTXO_COMPAT_IDS = new Set([
  'bitcoin',
  'bitcoin-testnet',
  'dash',
  'defichain',
  'pivx'
])

const FORCE_AVAXC_COMPAT_IDS = new Set([
  'avalanche-p-chain',
  'avalanche-x-chain',
  'avalanche-fuji-p-chain',
  'avalanche-fuji-x-chain'
])

const FORCE_POLYGON_COMPAT_IDS = new Set([
  'polygon-heimdall',
  'polygon-amoy-heimdall'
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
  'elys-testnet',
  'fetch',
  'injective',
  'injective-testnet',
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

  // Pattern mapping for additional server coin IDs:
  // map many chain variants/testnets into the closest app network model.
  if (normalized === 'ethereum-holesky') return 'eth'
  if (normalized === 'arbitrum-sepolia') return 'arb'
  if (normalized === 'base-sepolia') return 'base'
  if (normalized === 'opbnb' || normalized.startsWith('opbnb-')) return 'bnb'
  if (normalized === 'bsc' || normalized === 'bsc-testnet') return 'bnb'
  if (normalized === 'polygon' || normalized === 'polygon-bor' || normalized === 'polygon-amoy-bor') return 'polygon'
  if (normalized.startsWith('avalanche-') && normalized.includes('c-chain')) return 'avaxc'
  if (normalized === 'solana' || normalized.startsWith('solana-')) return 'sol'
  if (normalized === 'tron') return 'tron'
  if (normalized === 'tron-evm') return 'eth'
  if (normalized === 'optimism' || normalized === 'optimism-sepolia') return 'base'
  if (normalized === 'blast' || normalized.startsWith('blast-')) return 'eth'
  if (normalized === 'berachain' || normalized.startsWith('berachain-')) return 'eth'
  if (normalized === 'celo' || normalized.startsWith('celo-')) return 'eth'
  if (normalized === 'cronos' || normalized.startsWith('cronos-')) return 'eth'
  if (normalized === 'fraxtal' || normalized.startsWith('fraxtal-')) return 'eth'
  if (normalized === 'haqq' || normalized.startsWith('haqq-')) return 'eth'
  if (normalized === 'linea' || normalized === 'linea-sepolia') return 'eth'
  if (normalized === 'mantle' || normalized.startsWith('mantle-')) return 'eth'
  if (normalized === 'metis' || normalized === 'metis-sepolia') return 'eth'
  if (normalized === 'moonbeam' || normalized.startsWith('moonbeam-')) return 'eth'
  if (normalized === 'moonriver' || normalized.startsWith('moonriver-')) return 'eth'
  if (normalized === 'pulsechain' || normalized.startsWith('pulsechain-')) return 'eth'
  if (normalized === 'scroll' || normalized.startsWith('scroll-')) return 'eth'
  if (normalized === 'somnia' || normalized.startsWith('somnia-')) return 'eth'
  if (normalized === 'taiko' || normalized === 'taiko-hoodi') return 'eth'
  if (normalized === 'unichain' || normalized === 'unichain-sepolia') return 'base'
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
const PRIMARY_SERVER_COIN_BY_MODEL_ID: Record<string, string> = {
  rtm: 'raptoreum',
  doge: 'dogecoin',
  btcz: 'bitcoinz',
  tide: 'tidecoin',
  firo: 'firo',
  xrp: 'xrp',
  arr: 'arr',
  ada: 'cardano',
  xmr: 'monero',
  xlm: 'stellar',
  sol: 'solana',
  tron: 'tron',
  eth: 'ethereum',
  arb: 'arbitrum-one',
  base: 'base',
  bnb: 'bsc',
  polygon: 'polygon-bor',
  avaxc: 'avalanche-c-chain'
}

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

  const canSendCoin =
    methods.has('sendtoaddress')
    || methods.has('sendmany')
    || methods.has('eth_sendrawtransaction')
    || methods.has('submit')

  const assetLayer = isEvmModel || isRtm
  const assetSend = isEvmModel || isRtm || methods.has('sendasset')

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
  const symbolRaw = String(input.coin.symbol || '').trim().toUpperCase()
  const symbol = symbolRaw || suffix.slice(0, 6).toUpperCase()
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

function resolveAppNetworkId(baseNetworkId: string, serverCoinId: string): string {
  const normalizedServerCoinId = String(serverCoinId || '').trim().toLowerCase()
  const normalizedBaseNetworkId = String(baseNetworkId || '').trim().toLowerCase()
  const primary = PRIMARY_SERVER_COIN_BY_MODEL_ID[normalizedBaseNetworkId]
  if (primary && normalizedServerCoinId === primary) return normalizedBaseNetworkId
  const suffix = sanitizeServerCoinId(normalizedServerCoinId)
  if (!suffix || suffix === normalizedBaseNetworkId) return normalizedBaseNetworkId
  return `${normalizedBaseNetworkId}--${suffix}`
}

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
      symbol: String(coin.symbol || '').trim().toUpperCase(),
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
        runtimeModelId: modelNetworkId,
        serverCoinId: coinId,
        serverChain: chain,
        name: String(coin.name || base.name).trim() || base.name,
        symbol: String(coin.symbol || base.symbol).trim().toUpperCase() || base.symbol,
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
  const filteredCatalog = catalog.filter((item) => item.kind !== 'main' || spendableMainCoinIds.has(item.coinId))
  return {
    networks: ordered.length > 0 ? ordered : null,
    catalog: filteredCatalog
  }
}

export async function loadNetworksFromServerRegistry(): Promise<Network[] | null> {
  const snapshot = await loadServerRegistrySnapshot()
  return snapshot.networks
}
