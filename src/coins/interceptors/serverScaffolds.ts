import type { CoinApiInfo, CoinApiInterceptor } from './types'
import { c0gApiInterceptor, C0G_API_INFO } from './0g'
import { c0gBeaconApiInterceptor, C0GBEACON_API_INFO } from './0g-beacon'
import { akashApiInterceptor, AKASH_API_INFO } from './akash'
import { analogApiInterceptor, ANALOG_API_INFO } from './analog'
import { assetMantleApiInterceptor, ASSETMANTLE_API_INFO } from './asset-mantle'
import { atomoneApiInterceptor, ATOMONE_API_INFO } from './atomone'
import { availApiInterceptor, AVAIL_API_INFO } from './avail'
import { avalanchePChainApiInterceptor, AVALANCHEPCHAIN_API_INFO } from './avalanche-p-chain'
import { avalancheXChainApiInterceptor, AVALANCHEXCHAIN_API_INFO } from './avalanche-x-chain'
import { axelarApiInterceptor, AXELAR_API_INFO } from './axelar'
import { babylonApiInterceptor, BABYLON_API_INFO } from './babylon'
import { bitcannaApiInterceptor, BITCANNA_API_INFO } from './bitcanna'
import { bitcoinApiInterceptor, BITCOIN_API_INFO } from './bitcoin'
import { bitwayApiInterceptor, BITWAY_API_INFO } from './bitway'
import { celerApiInterceptor, CELER_API_INFO } from './celer'
import { celestiaApiInterceptor, CELESTIA_API_INFO } from './celestia'
import { cheqdApiInterceptor, CHEQD_API_INFO } from './cheqd'
import { chihuahuaApiInterceptor, CHIHUAHUA_API_INFO } from './chihuahua'
import { chilizApiInterceptor, CHILIZ_API_INFO } from './chiliz'
import { chilizSpicyApiInterceptor, CHILIZSPICY_API_INFO } from './chiliz-spicy'
import { comdexApiInterceptor, COMDEX_API_INFO } from './comdex'
import { coreumApiInterceptor, COREUM_API_INFO } from './coreum'
import { cosmosApiInterceptor, COSMOS_API_INFO } from './cosmos'
import { cronosPosApiInterceptor, CRONOSPOS_API_INFO } from './cronos-pos'
import { dashApiInterceptor, DASH_API_INFO } from './dash'
import { defichainApiInterceptor, DEFICHAIN_API_INFO } from './defichain'
import { doraApiInterceptor, DORA_API_INFO } from './dora'
import { dydxApiInterceptor, DYDX_API_INFO } from './dydx'
import { elysApiInterceptor, ELYS_API_INFO } from './elys'
import { fetchApiInterceptor, FETCH_API_INFO } from './fetch'
import { injectiveApiInterceptor, INJECTIVE_API_INFO } from './injective'
import { junoApiInterceptor, JUNO_API_INFO } from './juno'
import { kujiraApiInterceptor, KUJIRA_API_INFO } from './kujira'
import { kusamaApiInterceptor, KUSAMA_API_INFO } from './kusama'
import { lavaApiInterceptor, LAVA_API_INFO } from './lava'
import { lumeraApiInterceptor, LUMERA_API_INFO } from './lumera'
import { mantaAtlanticApiInterceptor, MANTAATLANTIC_API_INFO } from './manta-atlantic'
import { mediblocApiInterceptor, MEDIBLOC_API_INFO } from './medibloc'
import { neutronApiInterceptor, NEUTRON_API_INFO } from './neutron'
import { nolusApiInterceptor, NOLUS_API_INFO } from './nolus'
import { oraichainApiInterceptor, ORAICHAIN_API_INFO } from './oraichain'
import { osmosisApiInterceptor, OSMOSIS_API_INFO } from './osmosis'
import { passageApiInterceptor, PASSAGE_API_INFO } from './passage'
import { peaqApiInterceptor, PEAQ_API_INFO } from './peaq'
import { persistenceApiInterceptor, PERSISTENCE_API_INFO } from './persistence'
import { pivxApiInterceptor, PIVX_API_INFO } from './pivx'
import { polkadotApiInterceptor, POLKADOT_API_INFO } from './polkadot'
import { quicksilverApiInterceptor, QUICKSILVER_API_INFO } from './quicksilver'
import { rebusApiInterceptor, REBUS_API_INFO } from './rebus'
import { regenApiInterceptor, REGEN_API_INFO } from './regen'
import { rizonApiInterceptor, RIZON_API_INFO } from './rizon'
import { sagaApiInterceptor, SAGA_API_INFO } from './saga'
import { sentinelApiInterceptor, SENTINEL_API_INFO } from './sentinel'
import { shentuApiInterceptor, SHENTU_API_INFO } from './shentu'
import { sifchainApiInterceptor, SIFCHAIN_API_INFO } from './sifchain'
import { stargazeApiInterceptor, STARGAZE_API_INFO } from './stargaze'
import { strideApiInterceptor, STRIDE_API_INFO } from './stride'
import { syscoinTanenbaumEvmApiInterceptor, SYSCOINTANENBAUMEVM_API_INFO } from './syscoin-tanenbaum-evm'
import { teritoriApiInterceptor, TERITORI_API_INFO } from './teritori'
import { terraApiInterceptor, TERRA_API_INFO } from './terra'
import { terraClassicApiInterceptor, TERRACLASSIC_API_INFO } from './terra-classic'

export const SERVER_SCAFFOLD_API_INFO_BY_NETWORK_ID: Record<string, CoinApiInfo> = {
  'srv--0g': C0G_API_INFO,
  'srv--0g-beacon': C0GBEACON_API_INFO,
  'srv--akash': AKASH_API_INFO,
  'srv--analog': ANALOG_API_INFO,
  'srv--asset-mantle': ASSETMANTLE_API_INFO,
  'srv--atomone': ATOMONE_API_INFO,
  'srv--avail': AVAIL_API_INFO,
  'srv--avalanche-p-chain': AVALANCHEPCHAIN_API_INFO,
  'srv--avalanche-x-chain': AVALANCHEXCHAIN_API_INFO,
  'srv--axelar': AXELAR_API_INFO,
  'srv--babylon': BABYLON_API_INFO,
  'srv--bitcanna': BITCANNA_API_INFO,
  'srv--bitcoin': BITCOIN_API_INFO,
  'srv--bitway': BITWAY_API_INFO,
  'srv--celer': CELER_API_INFO,
  'srv--celestia': CELESTIA_API_INFO,
  'srv--cheqd': CHEQD_API_INFO,
  'srv--chihuahua': CHIHUAHUA_API_INFO,
  'srv--chiliz': CHILIZ_API_INFO,
  'srv--chiliz-spicy': CHILIZSPICY_API_INFO,
  'srv--comdex': COMDEX_API_INFO,
  'srv--coreum': COREUM_API_INFO,
  'srv--cosmos': COSMOS_API_INFO,
  'srv--cronos-pos': CRONOSPOS_API_INFO,
  'srv--dash': DASH_API_INFO,
  'srv--defichain': DEFICHAIN_API_INFO,
  'srv--dora': DORA_API_INFO,
  'srv--dydx': DYDX_API_INFO,
  'srv--elys': ELYS_API_INFO,
  'srv--fetch': FETCH_API_INFO,
  'srv--injective': INJECTIVE_API_INFO,
  'srv--juno': JUNO_API_INFO,
  'srv--kujira': KUJIRA_API_INFO,
  'srv--kusama': KUSAMA_API_INFO,
  'srv--lava': LAVA_API_INFO,
  'srv--lumera': LUMERA_API_INFO,
  'srv--manta-atlantic': MANTAATLANTIC_API_INFO,
  'srv--medibloc': MEDIBLOC_API_INFO,
  'srv--neutron': NEUTRON_API_INFO,
  'srv--nolus': NOLUS_API_INFO,
  'srv--oraichain': ORAICHAIN_API_INFO,
  'srv--osmosis': OSMOSIS_API_INFO,
  'srv--passage': PASSAGE_API_INFO,
  'srv--peaq': PEAQ_API_INFO,
  'srv--persistence': PERSISTENCE_API_INFO,
  'srv--pivx': PIVX_API_INFO,
  'srv--polkadot': POLKADOT_API_INFO,
  'srv--quicksilver': QUICKSILVER_API_INFO,
  'srv--rebus': REBUS_API_INFO,
  'srv--regen': REGEN_API_INFO,
  'srv--rizon': RIZON_API_INFO,
  'srv--saga': SAGA_API_INFO,
  'srv--sentinel': SENTINEL_API_INFO,
  'srv--shentu': SHENTU_API_INFO,
  'srv--sifchain': SIFCHAIN_API_INFO,
  'srv--stargaze': STARGAZE_API_INFO,
  'srv--stride': STRIDE_API_INFO,
  'srv--syscoin-tanenbaum-evm': SYSCOINTANENBAUMEVM_API_INFO,
  'srv--teritori': TERITORI_API_INFO,
  'srv--terra': TERRA_API_INFO,
  'srv--terra-classic': TERRACLASSIC_API_INFO,
}

export const SERVER_SCAFFOLD_INTERCEPTOR_BY_NETWORK_ID: Record<string, CoinApiInterceptor> = {
  'srv--0g': c0gApiInterceptor,
  'srv--0g-beacon': c0gBeaconApiInterceptor,
  'srv--akash': akashApiInterceptor,
  'srv--analog': analogApiInterceptor,
  'srv--asset-mantle': assetMantleApiInterceptor,
  'srv--atomone': atomoneApiInterceptor,
  'srv--avail': availApiInterceptor,
  'srv--avalanche-p-chain': avalanchePChainApiInterceptor,
  'srv--avalanche-x-chain': avalancheXChainApiInterceptor,
  'srv--axelar': axelarApiInterceptor,
  'srv--babylon': babylonApiInterceptor,
  'srv--bitcanna': bitcannaApiInterceptor,
  'srv--bitcoin': bitcoinApiInterceptor,
  'srv--bitway': bitwayApiInterceptor,
  'srv--celer': celerApiInterceptor,
  'srv--celestia': celestiaApiInterceptor,
  'srv--cheqd': cheqdApiInterceptor,
  'srv--chihuahua': chihuahuaApiInterceptor,
  'srv--chiliz': chilizApiInterceptor,
  'srv--chiliz-spicy': chilizSpicyApiInterceptor,
  'srv--comdex': comdexApiInterceptor,
  'srv--coreum': coreumApiInterceptor,
  'srv--cosmos': cosmosApiInterceptor,
  'srv--cronos-pos': cronosPosApiInterceptor,
  'srv--dash': dashApiInterceptor,
  'srv--defichain': defichainApiInterceptor,
  'srv--dora': doraApiInterceptor,
  'srv--dydx': dydxApiInterceptor,
  'srv--elys': elysApiInterceptor,
  'srv--fetch': fetchApiInterceptor,
  'srv--injective': injectiveApiInterceptor,
  'srv--juno': junoApiInterceptor,
  'srv--kujira': kujiraApiInterceptor,
  'srv--kusama': kusamaApiInterceptor,
  'srv--lava': lavaApiInterceptor,
  'srv--lumera': lumeraApiInterceptor,
  'srv--manta-atlantic': mantaAtlanticApiInterceptor,
  'srv--medibloc': mediblocApiInterceptor,
  'srv--neutron': neutronApiInterceptor,
  'srv--nolus': nolusApiInterceptor,
  'srv--oraichain': oraichainApiInterceptor,
  'srv--osmosis': osmosisApiInterceptor,
  'srv--passage': passageApiInterceptor,
  'srv--peaq': peaqApiInterceptor,
  'srv--persistence': persistenceApiInterceptor,
  'srv--pivx': pivxApiInterceptor,
  'srv--polkadot': polkadotApiInterceptor,
  'srv--quicksilver': quicksilverApiInterceptor,
  'srv--rebus': rebusApiInterceptor,
  'srv--regen': regenApiInterceptor,
  'srv--rizon': rizonApiInterceptor,
  'srv--saga': sagaApiInterceptor,
  'srv--sentinel': sentinelApiInterceptor,
  'srv--shentu': shentuApiInterceptor,
  'srv--sifchain': sifchainApiInterceptor,
  'srv--stargaze': stargazeApiInterceptor,
  'srv--stride': strideApiInterceptor,
  'srv--syscoin-tanenbaum-evm': syscoinTanenbaumEvmApiInterceptor,
  'srv--teritori': teritoriApiInterceptor,
  'srv--terra': terraApiInterceptor,
  'srv--terra-classic': terraClassicApiInterceptor,
}

