import type { CoinApiInfo, CoinApiInterceptor } from './types'
import { c0gApiInterceptor, C0G_API_INFO } from './0g'
import { c0gBeaconApiInterceptor, C0GBEACON_API_INFO } from './0g-beacon'
import { akashApiInterceptor, AKASH_API_INFO } from './akash'
import { analogApiInterceptor, ANALOG_API_INFO } from './analog'
import { assetMantleApiInterceptor, ASSETMANTLE_API_INFO } from './asset-mantle'
import { atomoneApiInterceptor, ATOMONE_API_INFO } from './atomone'
import { availApiInterceptor, AVAIL_API_INFO } from './avail'
import { avalancheFujiPChainApiInterceptor, AVALANCHEFUJIPCHAIN_API_INFO } from './avalanche-fuji-p-chain'
import { avalancheFujiXChainApiInterceptor, AVALANCHEFUJIXCHAIN_API_INFO } from './avalanche-fuji-x-chain'
import { avalanchePChainApiInterceptor, AVALANCHEPCHAIN_API_INFO } from './avalanche-p-chain'
import { avalancheXChainApiInterceptor, AVALANCHEXCHAIN_API_INFO } from './avalanche-x-chain'
import { axelarApiInterceptor, AXELAR_API_INFO } from './axelar'
import { babylonApiInterceptor, BABYLON_API_INFO } from './babylon'
import { baseSepoliaApiInterceptor, BASESEPOLIA_API_INFO } from './base-sepolia'
import { bitcannaApiInterceptor, BITCANNA_API_INFO } from './bitcanna'
import { bitcoinApiInterceptor, BITCOIN_API_INFO } from './bitcoin'
import { bitcoinTestnetApiInterceptor, BITCOINTESTNET_API_INFO } from './bitcoin-testnet'
import { bitwayApiInterceptor, BITWAY_API_INFO } from './bitway'
import { bscTestnetApiInterceptor, BSCTESTNET_API_INFO } from './bsc-testnet'
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
import { dymensionTestnetApiInterceptor, DYMENSIONTESTNET_API_INFO } from './dymension-testnet'
import { dymensionTestnetEvmApiInterceptor, DYMENSIONTESTNETEVM_API_INFO } from './dymension-testnet-evm'
import { elysApiInterceptor, ELYS_API_INFO } from './elys'
import { elysTestnetApiInterceptor, ELYSTESTNET_API_INFO } from './elys-testnet'
import { ethereumHoodiApiInterceptor, ETHEREUMHOODI_API_INFO } from './ethereum-hoodi'
import { ethereumSepoliaApiInterceptor, ETHEREUMSEPOLIA_API_INFO } from './ethereum-sepolia'
import { evmosTestnetApiInterceptor, EVMOSTESTNET_API_INFO } from './evmos-testnet'
import { evmosTestnetEvmApiInterceptor, EVMOSTESTNETEVM_API_INFO } from './evmos-testnet-evm'
import { fetchApiInterceptor, FETCH_API_INFO } from './fetch'
import { fraxtalHoodiApiInterceptor, FRAXTALHOODI_API_INFO } from './fraxtal-hoodi'
import { injectiveApiInterceptor, INJECTIVE_API_INFO } from './injective'
import { injectiveTestnetApiInterceptor, INJECTIVETESTNET_API_INFO } from './injective-testnet'
import { junoApiInterceptor, JUNO_API_INFO } from './juno'
import { kujiraApiInterceptor, KUJIRA_API_INFO } from './kujira'
import { kusamaApiInterceptor, KUSAMA_API_INFO } from './kusama'
import { lavaApiInterceptor, LAVA_API_INFO } from './lava'
import { lineaSepoliaApiInterceptor, LINEASEPOLIA_API_INFO } from './linea-sepolia'
import { lumeraApiInterceptor, LUMERA_API_INFO } from './lumera'
import { mantaAtlanticApiInterceptor, MANTAATLANTIC_API_INFO } from './manta-atlantic'
import { mediblocApiInterceptor, MEDIBLOC_API_INFO } from './medibloc'
import { metisSepoliaApiInterceptor, METISSEPOLIA_API_INFO } from './metis-sepolia'
import { neutronApiInterceptor, NEUTRON_API_INFO } from './neutron'
import { nolusApiInterceptor, NOLUS_API_INFO } from './nolus'
import { opbnbTestnetApiInterceptor, OPBNBTESTNET_API_INFO } from './opbnb-testnet'
import { optimismSepoliaApiInterceptor, OPTIMISMSEPOLIA_API_INFO } from './optimism-sepolia'
import { oraichainApiInterceptor, ORAICHAIN_API_INFO } from './oraichain'
import { osmosisApiInterceptor, OSMOSIS_API_INFO } from './osmosis'
import { passageApiInterceptor, PASSAGE_API_INFO } from './passage'
import { peaqApiInterceptor, PEAQ_API_INFO } from './peaq'
import { persistenceApiInterceptor, PERSISTENCE_API_INFO } from './persistence'
import { pivxApiInterceptor, PIVX_API_INFO } from './pivx'
import { polkadotApiInterceptor, POLKADOT_API_INFO } from './polkadot'
import { polygonAmoyBorApiInterceptor, POLYGONAMOYBOR_API_INFO } from './polygon-amoy-bor'
import { polygonAmoyHeimdallApiInterceptor, POLYGONAMOYHEIMDALL_API_INFO } from './polygon-amoy-heimdall'
import { pulsechainTestnetApiInterceptor, PULSECHAINTESTNET_API_INFO } from './pulsechain-testnet'
import { quicksilverApiInterceptor, QUICKSILVER_API_INFO } from './quicksilver'
import { rebusApiInterceptor, REBUS_API_INFO } from './rebus'
import { regenApiInterceptor, REGEN_API_INFO } from './regen'
import { rizonApiInterceptor, RIZON_API_INFO } from './rizon'
import { sagaApiInterceptor, SAGA_API_INFO } from './saga'
import { scrollSepoliaApiInterceptor, SCROLLSEPOLIA_API_INFO } from './scroll-sepolia'
import { sentinelApiInterceptor, SENTINEL_API_INFO } from './sentinel'
import { shentuApiInterceptor, SHENTU_API_INFO } from './shentu'
import { sifchainApiInterceptor, SIFCHAIN_API_INFO } from './sifchain'
import { solanaTestnetApiInterceptor, SOLANATESTNET_API_INFO } from './solana-testnet'
import { soneiumMinatoApiInterceptor, SONEIUMMINATO_API_INFO } from './soneium-minato'
import { sonicBlazeApiInterceptor, SONICBLAZE_API_INFO } from './sonic-blaze'
import { stargazeApiInterceptor, STARGAZE_API_INFO } from './stargaze'
import { strideApiInterceptor, STRIDE_API_INFO } from './stride'
import { syscoinTanenbaumEvmApiInterceptor, SYSCOINTANENBAUMEVM_API_INFO } from './syscoin-tanenbaum-evm'
import { taikoHoodiApiInterceptor, TAIKOHOODI_API_INFO } from './taiko-hoodi'
import { teritoriApiInterceptor, TERITORI_API_INFO } from './teritori'
import { terraApiInterceptor, TERRA_API_INFO } from './terra'
import { terraClassicApiInterceptor, TERRACLASSIC_API_INFO } from './terra-classic'
import { unichainSepoliaApiInterceptor, UNICHAINSEPOLIA_API_INFO } from './unichain-sepolia'

export const SERVER_SCAFFOLD_API_INFO_BY_NETWORK_ID: Record<string, CoinApiInfo> = {
  'srv--0g': C0G_API_INFO,
  'srv--0g-beacon': C0GBEACON_API_INFO,
  'srv--akash': AKASH_API_INFO,
  'srv--analog': ANALOG_API_INFO,
  'srv--asset-mantle': ASSETMANTLE_API_INFO,
  'srv--atomone': ATOMONE_API_INFO,
  'srv--avail': AVAIL_API_INFO,
  'srv--avalanche-fuji-p-chain': AVALANCHEFUJIPCHAIN_API_INFO,
  'srv--avalanche-fuji-x-chain': AVALANCHEFUJIXCHAIN_API_INFO,
  'srv--avalanche-p-chain': AVALANCHEPCHAIN_API_INFO,
  'srv--avalanche-x-chain': AVALANCHEXCHAIN_API_INFO,
  'srv--axelar': AXELAR_API_INFO,
  'srv--babylon': BABYLON_API_INFO,
  'srv--base-sepolia': BASESEPOLIA_API_INFO,
  'srv--bitcanna': BITCANNA_API_INFO,
  'srv--bitcoin': BITCOIN_API_INFO,
  'srv--bitcoin-testnet': BITCOINTESTNET_API_INFO,
  'srv--bitway': BITWAY_API_INFO,
  'srv--bsc-testnet': BSCTESTNET_API_INFO,
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
  'srv--dymension-testnet': DYMENSIONTESTNET_API_INFO,
  'srv--dymension-testnet-evm': DYMENSIONTESTNETEVM_API_INFO,
  'srv--elys': ELYS_API_INFO,
  'srv--elys-testnet': ELYSTESTNET_API_INFO,
  'srv--ethereum-hoodi': ETHEREUMHOODI_API_INFO,
  'srv--ethereum-sepolia': ETHEREUMSEPOLIA_API_INFO,
  'srv--evmos-testnet': EVMOSTESTNET_API_INFO,
  'srv--evmos-testnet-evm': EVMOSTESTNETEVM_API_INFO,
  'srv--fetch': FETCH_API_INFO,
  'srv--fraxtal-hoodi': FRAXTALHOODI_API_INFO,
  'srv--injective': INJECTIVE_API_INFO,
  'srv--injective-testnet': INJECTIVETESTNET_API_INFO,
  'srv--juno': JUNO_API_INFO,
  'srv--kujira': KUJIRA_API_INFO,
  'srv--kusama': KUSAMA_API_INFO,
  'srv--lava': LAVA_API_INFO,
  'srv--linea-sepolia': LINEASEPOLIA_API_INFO,
  'srv--lumera': LUMERA_API_INFO,
  'srv--manta-atlantic': MANTAATLANTIC_API_INFO,
  'srv--medibloc': MEDIBLOC_API_INFO,
  'srv--metis-sepolia': METISSEPOLIA_API_INFO,
  'srv--neutron': NEUTRON_API_INFO,
  'srv--nolus': NOLUS_API_INFO,
  'srv--opbnb-testnet': OPBNBTESTNET_API_INFO,
  'srv--optimism-sepolia': OPTIMISMSEPOLIA_API_INFO,
  'srv--oraichain': ORAICHAIN_API_INFO,
  'srv--osmosis': OSMOSIS_API_INFO,
  'srv--passage': PASSAGE_API_INFO,
  'srv--peaq': PEAQ_API_INFO,
  'srv--persistence': PERSISTENCE_API_INFO,
  'srv--pivx': PIVX_API_INFO,
  'srv--polkadot': POLKADOT_API_INFO,
  'srv--polygon-amoy-bor': POLYGONAMOYBOR_API_INFO,
  'srv--polygon-amoy-heimdall': POLYGONAMOYHEIMDALL_API_INFO,
  'srv--pulsechain-testnet': PULSECHAINTESTNET_API_INFO,
  'srv--quicksilver': QUICKSILVER_API_INFO,
  'srv--rebus': REBUS_API_INFO,
  'srv--regen': REGEN_API_INFO,
  'srv--rizon': RIZON_API_INFO,
  'srv--saga': SAGA_API_INFO,
  'srv--scroll-sepolia': SCROLLSEPOLIA_API_INFO,
  'srv--sentinel': SENTINEL_API_INFO,
  'srv--shentu': SHENTU_API_INFO,
  'srv--sifchain': SIFCHAIN_API_INFO,
  'srv--solana-testnet': SOLANATESTNET_API_INFO,
  'srv--soneium-minato': SONEIUMMINATO_API_INFO,
  'srv--sonic-blaze': SONICBLAZE_API_INFO,
  'srv--stargaze': STARGAZE_API_INFO,
  'srv--stride': STRIDE_API_INFO,
  'srv--syscoin-tanenbaum-evm': SYSCOINTANENBAUMEVM_API_INFO,
  'srv--taiko-hoodi': TAIKOHOODI_API_INFO,
  'srv--teritori': TERITORI_API_INFO,
  'srv--terra': TERRA_API_INFO,
  'srv--terra-classic': TERRACLASSIC_API_INFO,
  'srv--unichain-sepolia': UNICHAINSEPOLIA_API_INFO
}

export const SERVER_SCAFFOLD_INTERCEPTOR_BY_NETWORK_ID: Record<string, CoinApiInterceptor> = {
  'srv--0g': c0gApiInterceptor,
  'srv--0g-beacon': c0gBeaconApiInterceptor,
  'srv--akash': akashApiInterceptor,
  'srv--analog': analogApiInterceptor,
  'srv--asset-mantle': assetMantleApiInterceptor,
  'srv--atomone': atomoneApiInterceptor,
  'srv--avail': availApiInterceptor,
  'srv--avalanche-fuji-p-chain': avalancheFujiPChainApiInterceptor,
  'srv--avalanche-fuji-x-chain': avalancheFujiXChainApiInterceptor,
  'srv--avalanche-p-chain': avalanchePChainApiInterceptor,
  'srv--avalanche-x-chain': avalancheXChainApiInterceptor,
  'srv--axelar': axelarApiInterceptor,
  'srv--babylon': babylonApiInterceptor,
  'srv--base-sepolia': baseSepoliaApiInterceptor,
  'srv--bitcanna': bitcannaApiInterceptor,
  'srv--bitcoin': bitcoinApiInterceptor,
  'srv--bitcoin-testnet': bitcoinTestnetApiInterceptor,
  'srv--bitway': bitwayApiInterceptor,
  'srv--bsc-testnet': bscTestnetApiInterceptor,
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
  'srv--dymension-testnet': dymensionTestnetApiInterceptor,
  'srv--dymension-testnet-evm': dymensionTestnetEvmApiInterceptor,
  'srv--elys': elysApiInterceptor,
  'srv--elys-testnet': elysTestnetApiInterceptor,
  'srv--ethereum-hoodi': ethereumHoodiApiInterceptor,
  'srv--ethereum-sepolia': ethereumSepoliaApiInterceptor,
  'srv--evmos-testnet': evmosTestnetApiInterceptor,
  'srv--evmos-testnet-evm': evmosTestnetEvmApiInterceptor,
  'srv--fetch': fetchApiInterceptor,
  'srv--fraxtal-hoodi': fraxtalHoodiApiInterceptor,
  'srv--injective': injectiveApiInterceptor,
  'srv--injective-testnet': injectiveTestnetApiInterceptor,
  'srv--juno': junoApiInterceptor,
  'srv--kujira': kujiraApiInterceptor,
  'srv--kusama': kusamaApiInterceptor,
  'srv--lava': lavaApiInterceptor,
  'srv--linea-sepolia': lineaSepoliaApiInterceptor,
  'srv--lumera': lumeraApiInterceptor,
  'srv--manta-atlantic': mantaAtlanticApiInterceptor,
  'srv--medibloc': mediblocApiInterceptor,
  'srv--metis-sepolia': metisSepoliaApiInterceptor,
  'srv--neutron': neutronApiInterceptor,
  'srv--nolus': nolusApiInterceptor,
  'srv--opbnb-testnet': opbnbTestnetApiInterceptor,
  'srv--optimism-sepolia': optimismSepoliaApiInterceptor,
  'srv--oraichain': oraichainApiInterceptor,
  'srv--osmosis': osmosisApiInterceptor,
  'srv--passage': passageApiInterceptor,
  'srv--peaq': peaqApiInterceptor,
  'srv--persistence': persistenceApiInterceptor,
  'srv--pivx': pivxApiInterceptor,
  'srv--polkadot': polkadotApiInterceptor,
  'srv--polygon-amoy-bor': polygonAmoyBorApiInterceptor,
  'srv--polygon-amoy-heimdall': polygonAmoyHeimdallApiInterceptor,
  'srv--pulsechain-testnet': pulsechainTestnetApiInterceptor,
  'srv--quicksilver': quicksilverApiInterceptor,
  'srv--rebus': rebusApiInterceptor,
  'srv--regen': regenApiInterceptor,
  'srv--rizon': rizonApiInterceptor,
  'srv--saga': sagaApiInterceptor,
  'srv--scroll-sepolia': scrollSepoliaApiInterceptor,
  'srv--sentinel': sentinelApiInterceptor,
  'srv--shentu': shentuApiInterceptor,
  'srv--sifchain': sifchainApiInterceptor,
  'srv--solana-testnet': solanaTestnetApiInterceptor,
  'srv--soneium-minato': soneiumMinatoApiInterceptor,
  'srv--sonic-blaze': sonicBlazeApiInterceptor,
  'srv--stargaze': stargazeApiInterceptor,
  'srv--stride': strideApiInterceptor,
  'srv--syscoin-tanenbaum-evm': syscoinTanenbaumEvmApiInterceptor,
  'srv--taiko-hoodi': taikoHoodiApiInterceptor,
  'srv--teritori': teritoriApiInterceptor,
  'srv--terra': terraApiInterceptor,
  'srv--terra-classic': terraClassicApiInterceptor,
  'srv--unichain-sepolia': unichainSepoliaApiInterceptor
}

