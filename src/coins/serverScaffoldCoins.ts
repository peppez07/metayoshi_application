import type { CoinModule, CoinRuntimeContext, Network } from './types'
import { c0gCoin } from './0g'
import { c0gBeaconCoin } from './0g-beacon'
import { akashCoin } from './akash'
import { analogCoin } from './analog'
import { assetMantleCoin } from './asset-mantle'
import { atomoneCoin } from './atomone'
import { availCoin } from './avail'
import { avalanchePChainCoin } from './avalanche-p-chain'
import { avalancheXChainCoin } from './avalanche-x-chain'
import { axelarCoin } from './axelar'
import { babylonCoin } from './babylon'
import { bitcannaCoin } from './bitcanna'
import { bitcoinCoin } from './bitcoin'
import { bitwayCoin } from './bitway'
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
import { elysCoin } from './elys'
import { fetchCoin } from './fetch'
import { injectiveCoin } from './injective'
import { junoCoin } from './juno'
import { kujiraCoin } from './kujira'
import { kusamaCoin } from './kusama'
import { lavaCoin } from './lava'
import { lumeraCoin } from './lumera'
import { mantaAtlanticCoin } from './manta-atlantic'
import { mediblocCoin } from './medibloc'
import { neutronCoin } from './neutron'
import { nolusCoin } from './nolus'
import { oraichainCoin } from './oraichain'
import { osmosisCoin } from './osmosis'
import { passageCoin } from './passage'
import { peaqCoin } from './peaq'
import { persistenceCoin } from './persistence'
import { pivxCoin } from './pivx'
import { polkadotCoin } from './polkadot'
import { quicksilverCoin } from './quicksilver'
import { rebusCoin } from './rebus'
import { regenCoin } from './regen'
import { rizonCoin } from './rizon'
import { sagaCoin } from './saga'
import { sentinelCoin } from './sentinel'
import { shentuCoin } from './shentu'
import { sifchainCoin } from './sifchain'
import { stargazeCoin } from './stargaze'
import { strideCoin } from './stride'
import { syscoinTanenbaumEvmCoin } from './syscoin-tanenbaum-evm'
import { teritoriCoin } from './teritori'
import { terraCoin } from './terra'
import { terraClassicCoin } from './terra-classic'

const ALL_SERVER_SCAFFOLD_COIN_MODULES: CoinModule[] = [
  c0gCoin,
  c0gBeaconCoin,
  akashCoin,
  analogCoin,
  assetMantleCoin,
  atomoneCoin,
  availCoin,
  avalanchePChainCoin,
  avalancheXChainCoin,
  axelarCoin,
  babylonCoin,
  bitcannaCoin,
  bitcoinCoin,
  bitwayCoin,
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
  elysCoin,
  fetchCoin,
  injectiveCoin,
  junoCoin,
  kujiraCoin,
  kusamaCoin,
  lavaCoin,
  lumeraCoin,
  mantaAtlanticCoin,
  mediblocCoin,
  neutronCoin,
  nolusCoin,
  oraichainCoin,
  osmosisCoin,
  passageCoin,
  peaqCoin,
  persistenceCoin,
  pivxCoin,
  polkadotCoin,
  quicksilverCoin,
  rebusCoin,
  regenCoin,
  rizonCoin,
  sagaCoin,
  sentinelCoin,
  shentuCoin,
  sifchainCoin,
  stargazeCoin,
  strideCoin,
  syscoinTanenbaumEvmCoin,
  teritoriCoin,
  terraCoin,
  terraClassicCoin,
]

const ALL_SERVER_SCAFFOLD_SERVER_ID_TO_NETWORK_ID: Record<string, string> = {
  '0g': 'srv--0g',
  '0g-beacon': 'srv--0g-beacon',
  'akash': 'srv--akash',
  'analog': 'srv--analog',
  'asset-mantle': 'srv--asset-mantle',
  'atomone': 'srv--atomone',
  'avail': 'srv--avail',
  'avalanche-p-chain': 'srv--avalanche-p-chain',
  'avalanche-x-chain': 'srv--avalanche-x-chain',
  'axelar': 'srv--axelar',
  'babylon': 'srv--babylon',
  'bitcanna': 'srv--bitcanna',
  'bitcoin': 'srv--bitcoin',
  'bitway': 'srv--bitway',
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
  'elys': 'srv--elys',
  'fetch': 'srv--fetch',
  'injective': 'srv--injective',
  'juno': 'srv--juno',
  'kujira': 'srv--kujira',
  'kusama': 'srv--kusama',
  'lava': 'srv--lava',
  'lumera': 'srv--lumera',
  'manta-atlantic': 'srv--manta-atlantic',
  'medibloc': 'srv--medibloc',
  'neutron': 'srv--neutron',
  'nolus': 'srv--nolus',
  'oraichain': 'srv--oraichain',
  'osmosis': 'srv--osmosis',
  'passage': 'srv--passage',
  'peaq': 'srv--peaq',
  'persistence': 'srv--persistence',
  'pivx': 'srv--pivx',
  'polkadot': 'srv--polkadot',
  'quicksilver': 'srv--quicksilver',
  'rebus': 'srv--rebus',
  'regen': 'srv--regen',
  'rizon': 'srv--rizon',
  'saga': 'srv--saga',
  'sentinel': 'srv--sentinel',
  'shentu': 'srv--shentu',
  'sifchain': 'srv--sifchain',
  'stargaze': 'srv--stargaze',
  'stride': 'srv--stride',
  'syscoin-tanenbaum-evm': 'srv--syscoin-tanenbaum-evm',
  'teritori': 'srv--teritori',
  'terra': 'srv--terra',
  'terra-classic': 'srv--terra-classic',
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
