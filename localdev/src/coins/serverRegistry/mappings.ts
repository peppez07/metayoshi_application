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

const TESTNET_ID_MARKERS = /(testnet|sepolia|hoodi|fuji|amoy|minato|blaze|chiado|agung)/i
const BLOCKED_SERVER_COIN_IDS = new Set<string>([
  'defichain',
  'manta-atlantic',
  'pivx',
  'syscoin',
  'syscoin-evm',
  'syscoin-tanenbaum-evm'
])

const SERVER_COIN_TO_NETWORK_ID: Record<string, string> = {
  raptoreum: 'rtm',
  akash: 'akash',
  atomone: 'atomone',
  aurora: 'aurora',
  axelar: 'axelar',
  babylon: 'babylon',
  bahamut: 'bahamut',
  bitcanna: 'bitcanna',
  dogecoin: 'doge',
  dash: 'dash',
  bitcoin: 'srv--bitcoin',
  bitcoinz: 'btcz',
  zcash: 'zec',
  avalanche: 'avaxc',
  celestia: 'celestia',
  chihuahua: 'chihuahua',
  comdex: 'comdex',
  cosmos: 'cosmos',
  coreum: 'coreum',
  dydx: 'dydx',
  elys: 'elys',
  evmos: 'cosmos',
  fetch: 'fetch',
  injective: 'injective',
  juno: 'juno',
  kujira: 'kujira',
  lumera: 'lumera',
  medibloc: 'medibloc',
  neutron: 'neutron',
  nolus: 'nolus',
  oraichain: 'oraichain',
  osmosis: 'osmosis',
  passage: 'passage',
  persistence: 'persistence',
  quicksilver: 'quicksilver',
  regen: 'regen',
  saga: 'saga',
  sei: 'sei',
  sentinel: 'sentinel',
  shentu: 'shentu',
  stargaze: 'stargaze',
  stride: 'stride',
  terra: 'terra',
  teritori: 'teritori',
  'terra-classic': 'terra-classic',
  tidecoin: 'tide',
  firo: 'firo',
  gnosis: 'gnosis',
  xrp: 'xrp',
  arr: 'arr',
  cardano: 'ada',
  monero: 'xmr',
  stellar: 'xlm',
  xlm: 'xlm',
  ethereum: 'eth',
  'arbitrum-one': 'arb',
  'arbitrum-nova': 'arb',
  optimism: 'op',
  base: 'base',
  bsc: 'bnb',
  'polygon-bor': 'polygon',
  polygon: 'polygon',
  'avalanche-c-chain': 'avaxc',
  solana: 'sol',
  sui: 'sui',
  tron: 'tron',
  blast: 'blast',
  berachain: 'berachain',
  celo: 'celo',
  cronos: 'cronos',
  'cronos-evm': 'cronos',
  'zksync-era': 'zksync',
  fraxtal: 'fraxtal',
  haqq: 'haqq',
  mantle: 'mantle',
  moonbeam: 'moonbeam',
  moonriver: 'moonriver',
  'cronos-pos': 'cro',
  'dymension-evm': 'dymension-evm',
  'evmos-evm': 'evmos-evm',
  iris: 'iris-evm',
  'iris-evm': 'iris-evm',
  kava: 'kava-evm',
  'kava-evm': 'kava-evm',
  nibiru: 'nibiru-evm',
  'nibiru-evm': 'nibiru-evm',
  'sei-evm': 'sei-evm',
  tenet: 'tenet-evm',
  'tenet-evm': 'tenet-evm',
  warden: 'warden-evm',
  'warden-evm': 'warden-evm',
  xpla: 'xpla-evm',
  'xpla-evm': 'xpla-evm',
  'syscoin-tanenbaum-evm': 'eth',
  pulsechain: 'pulsechain',
  scroll: 'scroll',
  somnia: 'somnia',
  soneium: 'soneium',
  sonic: 'sonic',
  taiko: 'taiko',
  unichain: 'unichain',
  'tron-evm': 'eth'
}

const SERVER_ID_ALIAS_TO_NETWORK_ID: Record<string, string> = {
  dash: 'dash',
  sdash: 'dash'
}

const SERVER_SYMBOL_OVERRIDES: Record<string, string> = {
  bitcoin: 'BTC',
  'bitcoin-testnet': 'BTC',
  aurora: 'ETH',
  bahamut: 'FTN',
  gnosis: 'XDAI'
}

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
  'injective',
  'juno',
  'kujira',
  'kusama',
  'lava',
  'manta-atlantic',
  'neutron',
  'nolus',
  'osmosis',
  'persistence',
  'polkadot',
  'quicksilver',
  'rebus',
  'regen',
  'rizon',
  'sifchain',
  'stargaze',
  'stride',
  'terra',
  'terra-classic'
])

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
  'unichain',
  'zksync-era'
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

export const EVM_MODEL_NETWORK_IDS = new Set([
  'eth',
  'arb',
  'op',
  'base',
  'berachain',
  'blast',
  'bnb',
  'celo',
  'dymension-evm',
  'evmos-evm',
  'polygon',
  'avaxc',
  'aurora',
  'bahamut',
  'fraxtal',
  'gnosis',
  'haqq',
  'iris-evm',
  'kava-evm',
  'cronos',
  'linea',
  'mantle',
  'metis',
  'moonbeam',
  'moonriver',
  'nibiru-evm',
  'pulsechain',
  'scroll',
  'sei-evm',
  'somnia',
  'soneium',
  'sonic',
  'taiko',
  'tenet-evm',
  'unichain',
  'warden-evm',
  'xpla-evm',
  'zksync'
])
export const COSMOS_MODEL_NETWORK_IDS = new Set([
  'akash',
  'atomone',
  'axelar',
  'babylon',
  'bitcanna',
  'celestia',
  'chihuahua',
  'comdex',
  'cosmos',
  'coreum',
  'cro',
  'dydx',
  'elys',
  'fetch',
  'injective',
  'juno',
  'kujira',
  'lumera',
  'medibloc',
  'neutron',
  'nolus',
  'oraichain',
  'osmosis',
  'passage',
  'persistence',
  'quicksilver',
  'regen',
  'saga',
  'sei',
  'sentinel',
  'shentu',
  'stargaze',
  'stride',
  'terra',
  'terra-classic',
  'teritori'
])

export function isBlockedServerCoinId(coinId: string): boolean {
  const normalized = String(coinId || '').trim().toLowerCase()
  if (!normalized) return false
  return BLOCKED_SERVER_COIN_IDS.has(normalized) || TESTNET_ID_MARKERS.test(normalized)
}

export function isLikelyTokenServerCoinLike(coinId: string, name: string, symbol: string): boolean {
  const normalizedCoinId = String(coinId || '').trim().toLowerCase()
  const haystack = `${normalizedCoinId} ${String(name || '').trim().toLowerCase()} ${String(symbol || '').trim().toLowerCase()}`
  if (/^0x[0-9a-f]{40}$/i.test(normalizedCoinId)) return true
  if (normalizedCoinId.includes('/token/') || normalizedCoinId.includes('-token-') || normalizedCoinId.endsWith('-token')) return true
  if (normalizedCoinId.includes('contract')) return true
  for (const marker of TOKEN_MARKERS) {
    if (haystack.includes(marker)) return true
  }
  return false
}

export function mapServerCoinIdToNetworkId(coinId: string): string | null {
  const normalized = String(coinId || '').trim().toLowerCase()
  if (normalized === 'btc') return 'srv--bitcoin'
  const direct = SERVER_COIN_TO_NETWORK_ID[normalized]
  if (direct) return direct
  const scaffoldMapped = SERVER_ID_ALIAS_TO_NETWORK_ID[normalized]
  if (scaffoldMapped) return scaffoldMapped
  if (normalized === 'ethereum-holesky') return 'eth'
  if (normalized === 'opbnb' || normalized.startsWith('opbnb-')) return 'bnb'
  if (normalized === 'bsc') return 'bnb'
  if (normalized === 'optimism' || normalized.startsWith('optimism-')) return 'op'
  if (normalized === 'polygon' || normalized === 'polygon-bor') return 'polygon'
  if (normalized === 'sui') return 'sui'
  if (normalized.startsWith('avalanche-') && normalized.includes('c-chain')) return 'avaxc'
  if (normalized === 'solana') return 'sol'
  if (normalized === 'tron') return 'tron'
  if (normalized === 'tron-evm') return 'eth'
  if (normalized === 'blast' || normalized.startsWith('blast-')) return 'blast'
  if (normalized === 'berachain' || normalized.startsWith('berachain-')) return 'berachain'
  if (normalized === 'celo' || normalized.startsWith('celo-')) return 'celo'
  if (normalized === 'cronos-pos' || normalized.startsWith('cronos-pos')) return 'cro'
  if (normalized === 'cronos' || normalized === 'cronos-evm' || normalized.startsWith('cronos-evm')) return 'cronos'
  if (normalized === 'zksync' || normalized === 'zksync-era' || normalized.startsWith('zksync-era-')) return 'zksync'
  if (normalized === 'fraxtal' || normalized.startsWith('fraxtal-')) return 'fraxtal'
  if (normalized === 'haqq' || normalized.startsWith('haqq-')) return 'haqq'
  if (normalized === 'linea' || normalized.startsWith('linea-')) return 'linea'
  if (normalized === 'mantle' || normalized.startsWith('mantle-')) return 'mantle'
  if (normalized === 'metis' || normalized.startsWith('metis-')) return 'metis'
  if (normalized === 'moonbeam' || normalized.startsWith('moonbeam-')) return 'moonbeam'
  if (normalized === 'moonriver' || normalized.startsWith('moonriver-')) return 'moonriver'
  if (normalized === 'pulsechain' || normalized.startsWith('pulsechain-')) return 'pulsechain'
  if (normalized === 'scroll' || normalized.startsWith('scroll-')) return 'scroll'
  if (normalized === 'somnia' || normalized.startsWith('somnia-')) return 'somnia'
  if (normalized === 'taiko' || normalized.startsWith('taiko-')) return 'taiko'
  if (normalized === 'unichain' || normalized.startsWith('unichain-')) return 'unichain'
  if (normalized === 'soneium' || normalized.startsWith('soneium-')) return 'soneium'
  if (normalized === 'sonic' || normalized.startsWith('sonic-')) return 'sonic'
  if (normalized === 'evmos' || normalized.startsWith('evmos-')) return 'eth'
  if (normalized === 'dymension-evm' || normalized.startsWith('dymension-evm')) return 'dymension-evm'
  if (normalized === 'kava' || normalized.startsWith('kava-')) return 'eth'
  if (normalized === 'iris' || normalized === 'iris-evm' || normalized.startsWith('iris-evm')) return 'iris-evm'
  if (normalized === 'nibiru' || normalized === 'nibiru-evm' || normalized.startsWith('nibiru-evm')) return 'nibiru-evm'
  if (normalized === 'tenet' || normalized === 'tenet-evm' || normalized.startsWith('tenet-evm')) return 'tenet-evm'
  if (normalized === 'xpla' || normalized === 'xpla-evm' || normalized.startsWith('xpla-evm')) return 'xpla-evm'
  if (normalized === 'warden' || normalized === 'warden-evm' || normalized.startsWith('warden-evm')) return 'warden-evm'
  if (normalized === 'syscoin-evm' || normalized.startsWith('syscoin-')) return 'eth'
  if (normalized === 'xpla-evm' || normalized.startsWith('xpla-evm')) return 'xpla-evm'
  if (normalized === 'sei-evm' || normalized.startsWith('sei-evm')) return 'sei-evm'
  if (normalized === 'nibiru-evm' || normalized.startsWith('nibiru-evm')) return 'nibiru-evm'
  if (normalized === 'haqq-evm' || normalized.startsWith('haqq-evm')) return 'haqq'
  if (normalized === 'iris-evm' || normalized.startsWith('iris-evm')) return 'iris-evm'
  if (normalized === 'kava-evm' || normalized.startsWith('kava-evm')) return 'kava-evm'
  if (normalized === 'tenet-evm' || normalized.startsWith('tenet-evm')) return 'tenet-evm'
  if (normalized === 'dymension-evm' || normalized.startsWith('dymension-evm')) return 'dymension-evm'
  if (normalized === 'evmos-evm' || normalized.startsWith('evmos-evm')) return 'evmos-evm'
  if (normalized === 'warden-evm' || normalized.startsWith('warden-evm')) return 'warden-evm'
  if (FORCE_DOGE_UTXO_COMPAT_IDS.has(normalized)) return 'doge'
  if (FORCE_AVAXC_COMPAT_IDS.has(normalized)) return 'avaxc'
  if (FORCE_POLYGON_COMPAT_IDS.has(normalized)) return 'polygon'
  if (FORCE_ETH_COMPAT_IDS.has(normalized)) return 'eth'
  return null
}

export function sanitizeServerCoinId(coinId: string): string {
  return String(coinId || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

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

export function normalizeServerCoinSymbol(coinId: string, symbol: string, fallback?: string): string {
  const normalizedCoinId = String(coinId || '').trim().toLowerCase()
  const override = SERVER_SYMBOL_OVERRIDES[normalizedCoinId]
  if (override) return override
  const normalized = String(symbol || '').trim().toUpperCase()
  if (normalized) return normalized
  return String(fallback || '').trim().toUpperCase()
}

export function resolveAppNetworkId(baseNetworkId: string, serverCoinId: string): string {
  const normalizedBaseNetworkId = String(baseNetworkId || '').trim().toLowerCase()
  const normalizedServerCoinId = stripServerCoinVariantSuffix(serverCoinId)
  if (normalizedBaseNetworkId.startsWith('srv--')) {
    const parts = normalizedBaseNetworkId.split('--')
    if (parts.length >= 2 && parts[1]) return `srv--${parts[1]}`
    return normalizedBaseNetworkId
  }
  if (EVM_MODEL_NETWORK_IDS.has(normalizedBaseNetworkId)) {
    const canonicalServerIdByModel: Record<string, string> = {
      eth: 'ethereum',
      arb: 'arbitrum-one',
      op: 'optimism',
      base: 'base',
      berachain: 'berachain',
      blast: 'blast',
      bnb: 'bsc',
      celo: 'celo',
      'dymension-evm': 'dymension-evm',
      'evmos-evm': 'evmos-evm',
      aurora: 'aurora',
      bahamut: 'bahamut',
      fraxtal: 'fraxtal',
      gnosis: 'gnosis',
      haqq: 'haqq',
      'iris-evm': 'iris-evm',
      'kava-evm': 'kava-evm',
      cronos: 'cronos',
      linea: 'linea',
      mantle: 'mantle',
      metis: 'metis',
      moonbeam: 'moonbeam',
      moonriver: 'moonriver',
      'nibiru-evm': 'nibiru-evm',
      polygon: 'polygon-bor',
      pulsechain: 'pulsechain',
      avaxc: 'avalanche-c-chain',
      scroll: 'scroll',
      'sei-evm': 'sei-evm',
      somnia: 'somnia',
      soneium: 'soneium',
      sonic: 'sonic',
      taiko: 'taiko',
      'tenet-evm': 'tenet-evm',
      unichain: 'unichain',
      'warden-evm': 'warden-evm',
      'xpla-evm': 'xpla-evm',
      zksync: 'zksync-era'
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
  if (COSMOS_MODEL_NETWORK_IDS.has(normalizedBaseNetworkId)) {
    const canonicalServerIdByModel: Record<string, string> = {
      cosmos: 'cosmos',
      cro: 'cronos-pos',
      akash: 'akash',
      atomone: 'atomone',
      axelar: 'axelar',
      babylon: 'babylon',
      bitcanna: 'bitcanna',
      celestia: 'celestia',
      chihuahua: 'chihuahua',
      comdex: 'comdex',
      coreum: 'coreum',
      dydx: 'dydx',
      elys: 'elys',
      fetch: 'fetch',
      injective: 'injective',
      juno: 'juno',
      kujira: 'kujira',
      lumera: 'lumera',
      medibloc: 'medibloc',
      neutron: 'neutron',
      nolus: 'nolus',
      oraichain: 'oraichain',
      osmosis: 'osmosis',
      passage: 'passage',
      persistence: 'persistence',
      quicksilver: 'quicksilver',
      regen: 'regen',
      saga: 'saga',
      sei: 'sei',
      sentinel: 'sentinel',
      shentu: 'shentu',
      stargaze: 'stargaze',
      stride: 'stride',
      terra: 'terra',
      'terra-classic': 'terra-classic',
      teritori: 'teritori'
    }
    if (normalizedServerCoinId === canonicalServerIdByModel[normalizedBaseNetworkId]) {
      return normalizedBaseNetworkId
    }
    return `${normalizedBaseNetworkId}--${sanitizeServerCoinId(normalizedServerCoinId)}`
  }
  return normalizedBaseNetworkId
}

export function validateEthereumLayer2NetworkIdMapping(): void {
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

export function inferRuntimeModelFromTokenLikeCoinId(coinId: string): string | null {
  const normalized = String(coinId || '').trim().toLowerCase()
  if (!normalized) return null
  if (normalized.includes('arbitrum')) return 'arb'
  if (normalized.includes('aurora')) return 'aurora'
  if (normalized.includes('bahamut')) return 'bahamut'
  if (normalized.includes('berachain') || normalized.includes('bera')) return 'berachain'
  if (normalized.includes('haqq') || normalized.includes('islm')) return 'haqq'
  if (normalized.includes('moonbeam') || normalized.includes('glmr')) return 'moonbeam'
  if (normalized.includes('moonriver') || normalized.includes('movr')) return 'moonriver'
  if (normalized.includes('dymension-evm')) return 'dymension-evm'
  if (normalized.includes('evmos-evm')) return 'evmos-evm'
  if (normalized.includes('iris')) return 'iris-evm'
  if (normalized.includes('kava')) return 'kava-evm'
  if (normalized.includes('nibiru') || normalized.includes('nibi')) return 'nibiru-evm'
  if (normalized.includes('optimism')) return 'op'
  if (normalized.includes('polygon')) return 'polygon'
  if (normalized.includes('avalanche')) return 'avaxc'
  if (normalized.includes('base')) return 'base'
  if (normalized.includes('bsc') || normalized.includes('bnb')) return 'bnb'
  if (normalized.includes('cronos')) return 'cronos'
  if (normalized.includes('gnosis') || normalized.includes('xdai')) return 'gnosis'
  if (normalized.includes('sei-evm')) return 'sei-evm'
  if (normalized.includes('somnia') || normalized.includes('somi')) return 'somnia'
  if (normalized.includes('soneium')) return 'soneium'
  if (normalized.includes('sonic')) return 'sonic'
  if (normalized.includes('tenet')) return 'tenet-evm'
  if (normalized.includes('warden')) return 'warden-evm'
  if (normalized.includes('xpla')) return 'xpla-evm'
  if (normalized.includes('zksync')) return 'zksync'
  if (normalized.includes('sui')) return 'sui'
  if (normalized.includes('ethereum') || normalized.includes('eth')) return 'eth'
  if (normalized.includes('solana') || normalized.includes('spl')) return 'sol'
  if (normalized.includes('tron') || normalized.includes('trc20')) return 'tron'
  return null
}
