import type { CoinModule, CoinRuntimeContext, Network } from './types'
import { c0gCoin } from './0g'
import { c0gBeaconCoin } from './0g-beacon'
import { akashCoin } from './akash'
import { analogCoin } from './analog'
import { assetMantleCoin } from './asset-mantle'
import { atomoneCoin } from './atomone'
import { availCoin } from './avail'
import { avalancheFujiPChainCoin } from './avalanche-fuji-p-chain'
import { avalancheFujiXChainCoin } from './avalanche-fuji-x-chain'
import { avalanchePChainCoin } from './avalanche-p-chain'
import { avalancheXChainCoin } from './avalanche-x-chain'
import { axelarCoin } from './axelar'
import { babylonCoin } from './babylon'
import { baseSepoliaCoin } from './base-sepolia'
import { bitcannaCoin } from './bitcanna'
import { bitcoinCoin } from './bitcoin'
import { bitcoinTestnetCoin } from './bitcoin-testnet'
import { bitwayCoin } from './bitway'
import { bscTestnetCoin } from './bsc-testnet'
import { celerCoin } from './celer'
import { celestiaCoin } from './celestia'
import { cheqdCoin } from './cheqd'
import { chihuahuaCoin } from './chihuahua'
import { chilizCoin } from './chiliz'
import { chilizSpicyCoin } from './chiliz-spicy'
import { comdexCoin } from './comdex'
import { coreumCoin } from './coreum'
import { cosmosCoin } from './cosmos'
import { cronosPosCoin } from './cronos-pos'
import { dashCoin } from './dash'
import { defichainCoin } from './defichain'
import { doraCoin } from './dora'
import { dydxCoin } from './dydx'
import { dymensionTestnetCoin } from './dymension-testnet'
import { dymensionTestnetEvmCoin } from './dymension-testnet-evm'
import { elysCoin } from './elys'
import { elysTestnetCoin } from './elys-testnet'
import { ethereumHoodiCoin } from './ethereum-hoodi'
import { ethereumSepoliaCoin } from './ethereum-sepolia'
import { evmosTestnetCoin } from './evmos-testnet'
import { evmosTestnetEvmCoin } from './evmos-testnet-evm'
import { fetchCoin } from './fetch'
import { fraxtalHoodiCoin } from './fraxtal-hoodi'
import { injectiveCoin } from './injective'
import { injectiveTestnetCoin } from './injective-testnet'
import { junoCoin } from './juno'
import { kujiraCoin } from './kujira'
import { kusamaCoin } from './kusama'
import { lavaCoin } from './lava'
import { lineaSepoliaCoin } from './linea-sepolia'
import { lumeraCoin } from './lumera'
import { mantaAtlanticCoin } from './manta-atlantic'
import { mediblocCoin } from './medibloc'
import { metisSepoliaCoin } from './metis-sepolia'
import { neutronCoin } from './neutron'
import { nolusCoin } from './nolus'
import { opbnbTestnetCoin } from './opbnb-testnet'
import { optimismSepoliaCoin } from './optimism-sepolia'
import { oraichainCoin } from './oraichain'
import { osmosisCoin } from './osmosis'
import { passageCoin } from './passage'
import { peaqCoin } from './peaq'
import { persistenceCoin } from './persistence'
import { pivxCoin } from './pivx'
import { polkadotCoin } from './polkadot'
import { polygonAmoyBorCoin } from './polygon-amoy-bor'
import { polygonAmoyHeimdallCoin } from './polygon-amoy-heimdall'
import { pulsechainTestnetCoin } from './pulsechain-testnet'
import { quicksilverCoin } from './quicksilver'
import { rebusCoin } from './rebus'
import { regenCoin } from './regen'
import { rizonCoin } from './rizon'
import { sagaCoin } from './saga'
import { scrollSepoliaCoin } from './scroll-sepolia'
import { sentinelCoin } from './sentinel'
import { shentuCoin } from './shentu'
import { sifchainCoin } from './sifchain'
import { solanaTestnetCoin } from './solana-testnet'
import { soneiumMinatoCoin } from './soneium-minato'
import { sonicBlazeCoin } from './sonic-blaze'
import { stargazeCoin } from './stargaze'
import { strideCoin } from './stride'
import { syscoinTanenbaumEvmCoin } from './syscoin-tanenbaum-evm'
import { taikoHoodiCoin } from './taiko-hoodi'
import { teritoriCoin } from './teritori'
import { terraCoin } from './terra'
import { terraClassicCoin } from './terra-classic'
import { unichainSepoliaCoin } from './unichain-sepolia'

const ALL_SERVER_SCAFFOLD_COIN_MODULES: CoinModule[] = [
  c0gCoin,
  c0gBeaconCoin,
  akashCoin,
  analogCoin,
  assetMantleCoin,
  atomoneCoin,
  availCoin,
  avalancheFujiPChainCoin,
  avalancheFujiXChainCoin,
  avalanchePChainCoin,
  avalancheXChainCoin,
  axelarCoin,
  babylonCoin,
  baseSepoliaCoin,
  bitcannaCoin,
  bitcoinCoin,
  bitcoinTestnetCoin,
  bitwayCoin,
  bscTestnetCoin,
  celerCoin,
  celestiaCoin,
  cheqdCoin,
  chihuahuaCoin,
  chilizCoin,
  chilizSpicyCoin,
  comdexCoin,
  coreumCoin,
  cosmosCoin,
  cronosPosCoin,
  dashCoin,
  defichainCoin,
  doraCoin,
  dydxCoin,
  dymensionTestnetCoin,
  dymensionTestnetEvmCoin,
  elysCoin,
  elysTestnetCoin,
  ethereumHoodiCoin,
  ethereumSepoliaCoin,
  evmosTestnetCoin,
  evmosTestnetEvmCoin,
  fetchCoin,
  fraxtalHoodiCoin,
  injectiveCoin,
  injectiveTestnetCoin,
  junoCoin,
  kujiraCoin,
  kusamaCoin,
  lavaCoin,
  lineaSepoliaCoin,
  lumeraCoin,
  mantaAtlanticCoin,
  mediblocCoin,
  metisSepoliaCoin,
  neutronCoin,
  nolusCoin,
  opbnbTestnetCoin,
  optimismSepoliaCoin,
  oraichainCoin,
  osmosisCoin,
  passageCoin,
  peaqCoin,
  persistenceCoin,
  pivxCoin,
  polkadotCoin,
  polygonAmoyBorCoin,
  polygonAmoyHeimdallCoin,
  pulsechainTestnetCoin,
  quicksilverCoin,
  rebusCoin,
  regenCoin,
  rizonCoin,
  sagaCoin,
  scrollSepoliaCoin,
  sentinelCoin,
  shentuCoin,
  sifchainCoin,
  solanaTestnetCoin,
  soneiumMinatoCoin,
  sonicBlazeCoin,
  stargazeCoin,
  strideCoin,
  syscoinTanenbaumEvmCoin,
  taikoHoodiCoin,
  teritoriCoin,
  terraCoin,
  terraClassicCoin,
  unichainSepoliaCoin
]

const ALL_SERVER_SCAFFOLD_SERVER_ID_TO_NETWORK_ID: Record<string, string> = {
  '0g': 'srv--0g',
  '0g-beacon': 'srv--0g-beacon',
  'akash': 'srv--akash',
  'analog': 'srv--analog',
  'asset-mantle': 'srv--asset-mantle',
  'atomone': 'srv--atomone',
  'avail': 'srv--avail',
  'avalanche-fuji-p-chain': 'srv--avalanche-fuji-p-chain',
  'avalanche-fuji-x-chain': 'srv--avalanche-fuji-x-chain',
  'avalanche-p-chain': 'srv--avalanche-p-chain',
  'avalanche-x-chain': 'srv--avalanche-x-chain',
  'axelar': 'srv--axelar',
  'babylon': 'srv--babylon',
  'base-sepolia': 'srv--base-sepolia',
  'bitcanna': 'srv--bitcanna',
  'bitcoin': 'srv--bitcoin',
  'bitcoin-testnet': 'srv--bitcoin-testnet',
  'bitway': 'srv--bitway',
  'bsc-testnet': 'srv--bsc-testnet',
  'celer': 'srv--celer',
  'celestia': 'srv--celestia',
  'cheqd': 'srv--cheqd',
  'chihuahua': 'srv--chihuahua',
  'chiliz': 'srv--chiliz',
  'chiliz-spicy': 'srv--chiliz-spicy',
  'comdex': 'srv--comdex',
  'coreum': 'srv--coreum',
  'cosmos': 'srv--cosmos',
  'cronos-pos': 'srv--cronos-pos',
  'dash': 'srv--dash',
  'defichain': 'srv--defichain',
  'dora': 'srv--dora',
  'dydx': 'srv--dydx',
  'dymension-testnet': 'srv--dymension-testnet',
  'dymension-testnet-evm': 'srv--dymension-testnet-evm',
  'elys': 'srv--elys',
  'elys-testnet': 'srv--elys-testnet',
  'ethereum-hoodi': 'srv--ethereum-hoodi',
  'ethereum-sepolia': 'srv--ethereum-sepolia',
  'evmos-testnet': 'srv--evmos-testnet',
  'evmos-testnet-evm': 'srv--evmos-testnet-evm',
  'fetch': 'srv--fetch',
  'fraxtal-hoodi': 'srv--fraxtal-hoodi',
  'injective': 'srv--injective',
  'injective-testnet': 'srv--injective-testnet',
  'juno': 'srv--juno',
  'kujira': 'srv--kujira',
  'kusama': 'srv--kusama',
  'lava': 'srv--lava',
  'linea-sepolia': 'srv--linea-sepolia',
  'lumera': 'srv--lumera',
  'manta-atlantic': 'srv--manta-atlantic',
  'medibloc': 'srv--medibloc',
  'metis-sepolia': 'srv--metis-sepolia',
  'neutron': 'srv--neutron',
  'nolus': 'srv--nolus',
  'opbnb-testnet': 'srv--opbnb-testnet',
  'optimism-sepolia': 'srv--optimism-sepolia',
  'oraichain': 'srv--oraichain',
  'osmosis': 'srv--osmosis',
  'passage': 'srv--passage',
  'peaq': 'srv--peaq',
  'persistence': 'srv--persistence',
  'pivx': 'srv--pivx',
  'polkadot': 'srv--polkadot',
  'polygon-amoy-bor': 'srv--polygon-amoy-bor',
  'polygon-amoy-heimdall': 'srv--polygon-amoy-heimdall',
  'pulsechain-testnet': 'srv--pulsechain-testnet',
  'quicksilver': 'srv--quicksilver',
  'rebus': 'srv--rebus',
  'regen': 'srv--regen',
  'rizon': 'srv--rizon',
  'saga': 'srv--saga',
  'scroll-sepolia': 'srv--scroll-sepolia',
  'sentinel': 'srv--sentinel',
  'shentu': 'srv--shentu',
  'sifchain': 'srv--sifchain',
  'solana-testnet': 'srv--solana-testnet',
  'soneium-minato': 'srv--soneium-minato',
  'sonic-blaze': 'srv--sonic-blaze',
  'stargaze': 'srv--stargaze',
  'stride': 'srv--stride',
  'syscoin-tanenbaum-evm': 'srv--syscoin-tanenbaum-evm',
  'taiko-hoodi': 'srv--taiko-hoodi',
  'teritori': 'srv--teritori',
  'terra': 'srv--terra',
  'terra-classic': 'srv--terra-classic',
  'unichain-sepolia': 'srv--unichain-sepolia'
}

const SCAFFOLD_FILTER_API_BASE_URL = String((import.meta as any)?.env?.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '')
  || 'http://127.0.0.1'

const SCAFFOLD_FILTER_RUNTIME_CONTEXT: CoinRuntimeContext = {
  apiBaseUrl: SCAFFOLD_FILTER_API_BASE_URL,
  buildBridgeUrl: (coin: string, chain: 'main' | 'test', wallet?: string): string => {
    const base = `${SCAFFOLD_FILTER_API_BASE_URL}/v1/bridge/${coin}/${chain}`
    return wallet ? `${base}/wallet/${encodeURIComponent(wallet)}` : base
  }
}

function isSpendableScaffoldNetwork(network: Network | null | undefined): boolean {
  if (!network) return false
  if (network.derivation?.status === 'unsupported') return false
  return network.capabilities?.features?.nativeSend === true
}

function isSpendableScaffoldModule(module: CoinModule): boolean {
  try {
    const network = module.createNetwork(SCAFFOLD_FILTER_RUNTIME_CONTEXT)
    return isSpendableScaffoldNetwork(network)
  } catch {
    return false
  }
}

export const SERVER_SCAFFOLD_COIN_MODULES: CoinModule[] = ALL_SERVER_SCAFFOLD_COIN_MODULES
  .filter((module) => isSpendableScaffoldModule(module))

const ENABLED_SERVER_SCAFFOLD_NETWORK_IDS = new Set(SERVER_SCAFFOLD_COIN_MODULES.map((module) => module.id))

export const SERVER_SCAFFOLD_SERVER_ID_TO_NETWORK_ID: Record<string, string> = Object.fromEntries(
  Object.entries(ALL_SERVER_SCAFFOLD_SERVER_ID_TO_NETWORK_ID)
    .filter(([, networkId]) => ENABLED_SERVER_SCAFFOLD_NETWORK_IDS.has(networkId))
)
