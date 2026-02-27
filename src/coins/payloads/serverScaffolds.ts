import type { CoinPayloadCatalog } from './types'
import { C0G_PAYLOADS } from './0g'
import { C0GBEACON_PAYLOADS } from './0g-beacon'
import { AKASH_PAYLOADS } from './akash'
import { ANALOG_PAYLOADS } from './analog'
import { ASSETMANTLE_PAYLOADS } from './asset-mantle'
import { ATOMONE_PAYLOADS } from './atomone'
import { AVAIL_PAYLOADS } from './avail'
import { AVALANCHEFUJIPCHAIN_PAYLOADS } from './avalanche-fuji-p-chain'
import { AVALANCHEFUJIXCHAIN_PAYLOADS } from './avalanche-fuji-x-chain'
import { AVALANCHEPCHAIN_PAYLOADS } from './avalanche-p-chain'
import { AVALANCHEXCHAIN_PAYLOADS } from './avalanche-x-chain'
import { AXELAR_PAYLOADS } from './axelar'
import { BABYLON_PAYLOADS } from './babylon'
import { BASESEPOLIA_PAYLOADS } from './base-sepolia'
import { BITCANNA_PAYLOADS } from './bitcanna'
import { BITCOIN_PAYLOADS } from './bitcoin'
import { BITCOINTESTNET_PAYLOADS } from './bitcoin-testnet'
import { BITWAY_PAYLOADS } from './bitway'
import { BSCTESTNET_PAYLOADS } from './bsc-testnet'
import { CELER_PAYLOADS } from './celer'
import { CELESTIA_PAYLOADS } from './celestia'
import { CHEQD_PAYLOADS } from './cheqd'
import { CHIHUAHUA_PAYLOADS } from './chihuahua'
import { CHILIZ_PAYLOADS } from './chiliz'
import { CHILIZSPICY_PAYLOADS } from './chiliz-spicy'
import { COMDEX_PAYLOADS } from './comdex'
import { COREUM_PAYLOADS } from './coreum'
import { COSMOS_PAYLOADS } from './cosmos'
import { CRONOSPOS_PAYLOADS } from './cronos-pos'
import { DASH_PAYLOADS } from './dash'
import { DEFICHAIN_PAYLOADS } from './defichain'
import { DORA_PAYLOADS } from './dora'
import { DYDX_PAYLOADS } from './dydx'
import { DYMENSIONTESTNET_PAYLOADS } from './dymension-testnet'
import { DYMENSIONTESTNETEVM_PAYLOADS } from './dymension-testnet-evm'
import { ELYS_PAYLOADS } from './elys'
import { ELYSTESTNET_PAYLOADS } from './elys-testnet'
import { ETHEREUMHOODI_PAYLOADS } from './ethereum-hoodi'
import { ETHEREUMSEPOLIA_PAYLOADS } from './ethereum-sepolia'
import { EVMOSTESTNET_PAYLOADS } from './evmos-testnet'
import { EVMOSTESTNETEVM_PAYLOADS } from './evmos-testnet-evm'
import { FETCH_PAYLOADS } from './fetch'
import { FRAXTALHOODI_PAYLOADS } from './fraxtal-hoodi'
import { INJECTIVE_PAYLOADS } from './injective'
import { INJECTIVETESTNET_PAYLOADS } from './injective-testnet'
import { JUNO_PAYLOADS } from './juno'
import { KUJIRA_PAYLOADS } from './kujira'
import { KUSAMA_PAYLOADS } from './kusama'
import { LAVA_PAYLOADS } from './lava'
import { LINEASEPOLIA_PAYLOADS } from './linea-sepolia'
import { LUMERA_PAYLOADS } from './lumera'
import { MANTAATLANTIC_PAYLOADS } from './manta-atlantic'
import { MEDIBLOC_PAYLOADS } from './medibloc'
import { METISSEPOLIA_PAYLOADS } from './metis-sepolia'
import { NEUTRON_PAYLOADS } from './neutron'
import { NOLUS_PAYLOADS } from './nolus'
import { OPBNBTESTNET_PAYLOADS } from './opbnb-testnet'
import { OPTIMISMSEPOLIA_PAYLOADS } from './optimism-sepolia'
import { ORAICHAIN_PAYLOADS } from './oraichain'
import { OSMOSIS_PAYLOADS } from './osmosis'
import { PASSAGE_PAYLOADS } from './passage'
import { PEAQ_PAYLOADS } from './peaq'
import { PERSISTENCE_PAYLOADS } from './persistence'
import { PIVX_PAYLOADS } from './pivx'
import { POLKADOT_PAYLOADS } from './polkadot'
import { POLYGONAMOYBOR_PAYLOADS } from './polygon-amoy-bor'
import { POLYGONAMOYHEIMDALL_PAYLOADS } from './polygon-amoy-heimdall'
import { PULSECHAINTESTNET_PAYLOADS } from './pulsechain-testnet'
import { QUICKSILVER_PAYLOADS } from './quicksilver'
import { REBUS_PAYLOADS } from './rebus'
import { REGEN_PAYLOADS } from './regen'
import { RIZON_PAYLOADS } from './rizon'
import { SAGA_PAYLOADS } from './saga'
import { SCROLLSEPOLIA_PAYLOADS } from './scroll-sepolia'
import { SENTINEL_PAYLOADS } from './sentinel'
import { SHENTU_PAYLOADS } from './shentu'
import { SIFCHAIN_PAYLOADS } from './sifchain'
import { SOLANATESTNET_PAYLOADS } from './solana-testnet'
import { SONEIUMMINATO_PAYLOADS } from './soneium-minato'
import { SONICBLAZE_PAYLOADS } from './sonic-blaze'
import { STARGAZE_PAYLOADS } from './stargaze'
import { STRIDE_PAYLOADS } from './stride'
import { SYSCOINTANENBAUMEVM_PAYLOADS } from './syscoin-tanenbaum-evm'
import { TAIKOHOODI_PAYLOADS } from './taiko-hoodi'
import { TERITORI_PAYLOADS } from './teritori'
import { TERRA_PAYLOADS } from './terra'
import { TERRACLASSIC_PAYLOADS } from './terra-classic'
import { UNICHAINSEPOLIA_PAYLOADS } from './unichain-sepolia'

export const SERVER_SCAFFOLD_PAYLOADS_BY_NETWORK_ID: Record<string, CoinPayloadCatalog> = {
  'srv--0g': C0G_PAYLOADS,
  'srv--0g-beacon': C0GBEACON_PAYLOADS,
  'srv--akash': AKASH_PAYLOADS,
  'srv--analog': ANALOG_PAYLOADS,
  'srv--asset-mantle': ASSETMANTLE_PAYLOADS,
  'srv--atomone': ATOMONE_PAYLOADS,
  'srv--avail': AVAIL_PAYLOADS,
  'srv--avalanche-fuji-p-chain': AVALANCHEFUJIPCHAIN_PAYLOADS,
  'srv--avalanche-fuji-x-chain': AVALANCHEFUJIXCHAIN_PAYLOADS,
  'srv--avalanche-p-chain': AVALANCHEPCHAIN_PAYLOADS,
  'srv--avalanche-x-chain': AVALANCHEXCHAIN_PAYLOADS,
  'srv--axelar': AXELAR_PAYLOADS,
  'srv--babylon': BABYLON_PAYLOADS,
  'srv--base-sepolia': BASESEPOLIA_PAYLOADS,
  'srv--bitcanna': BITCANNA_PAYLOADS,
  'srv--bitcoin': BITCOIN_PAYLOADS,
  'srv--bitcoin-testnet': BITCOINTESTNET_PAYLOADS,
  'srv--bitway': BITWAY_PAYLOADS,
  'srv--bsc-testnet': BSCTESTNET_PAYLOADS,
  'srv--celer': CELER_PAYLOADS,
  'srv--celestia': CELESTIA_PAYLOADS,
  'srv--cheqd': CHEQD_PAYLOADS,
  'srv--chihuahua': CHIHUAHUA_PAYLOADS,
  'srv--chiliz': CHILIZ_PAYLOADS,
  'srv--chiliz-spicy': CHILIZSPICY_PAYLOADS,
  'srv--comdex': COMDEX_PAYLOADS,
  'srv--coreum': COREUM_PAYLOADS,
  'srv--cosmos': COSMOS_PAYLOADS,
  'srv--cronos-pos': CRONOSPOS_PAYLOADS,
  'srv--dash': DASH_PAYLOADS,
  'srv--defichain': DEFICHAIN_PAYLOADS,
  'srv--dora': DORA_PAYLOADS,
  'srv--dydx': DYDX_PAYLOADS,
  'srv--dymension-testnet': DYMENSIONTESTNET_PAYLOADS,
  'srv--dymension-testnet-evm': DYMENSIONTESTNETEVM_PAYLOADS,
  'srv--elys': ELYS_PAYLOADS,
  'srv--elys-testnet': ELYSTESTNET_PAYLOADS,
  'srv--ethereum-hoodi': ETHEREUMHOODI_PAYLOADS,
  'srv--ethereum-sepolia': ETHEREUMSEPOLIA_PAYLOADS,
  'srv--evmos-testnet': EVMOSTESTNET_PAYLOADS,
  'srv--evmos-testnet-evm': EVMOSTESTNETEVM_PAYLOADS,
  'srv--fetch': FETCH_PAYLOADS,
  'srv--fraxtal-hoodi': FRAXTALHOODI_PAYLOADS,
  'srv--injective': INJECTIVE_PAYLOADS,
  'srv--injective-testnet': INJECTIVETESTNET_PAYLOADS,
  'srv--juno': JUNO_PAYLOADS,
  'srv--kujira': KUJIRA_PAYLOADS,
  'srv--kusama': KUSAMA_PAYLOADS,
  'srv--lava': LAVA_PAYLOADS,
  'srv--linea-sepolia': LINEASEPOLIA_PAYLOADS,
  'srv--lumera': LUMERA_PAYLOADS,
  'srv--manta-atlantic': MANTAATLANTIC_PAYLOADS,
  'srv--medibloc': MEDIBLOC_PAYLOADS,
  'srv--metis-sepolia': METISSEPOLIA_PAYLOADS,
  'srv--neutron': NEUTRON_PAYLOADS,
  'srv--nolus': NOLUS_PAYLOADS,
  'srv--opbnb-testnet': OPBNBTESTNET_PAYLOADS,
  'srv--optimism-sepolia': OPTIMISMSEPOLIA_PAYLOADS,
  'srv--oraichain': ORAICHAIN_PAYLOADS,
  'srv--osmosis': OSMOSIS_PAYLOADS,
  'srv--passage': PASSAGE_PAYLOADS,
  'srv--peaq': PEAQ_PAYLOADS,
  'srv--persistence': PERSISTENCE_PAYLOADS,
  'srv--pivx': PIVX_PAYLOADS,
  'srv--polkadot': POLKADOT_PAYLOADS,
  'srv--polygon-amoy-bor': POLYGONAMOYBOR_PAYLOADS,
  'srv--polygon-amoy-heimdall': POLYGONAMOYHEIMDALL_PAYLOADS,
  'srv--pulsechain-testnet': PULSECHAINTESTNET_PAYLOADS,
  'srv--quicksilver': QUICKSILVER_PAYLOADS,
  'srv--rebus': REBUS_PAYLOADS,
  'srv--regen': REGEN_PAYLOADS,
  'srv--rizon': RIZON_PAYLOADS,
  'srv--saga': SAGA_PAYLOADS,
  'srv--scroll-sepolia': SCROLLSEPOLIA_PAYLOADS,
  'srv--sentinel': SENTINEL_PAYLOADS,
  'srv--shentu': SHENTU_PAYLOADS,
  'srv--sifchain': SIFCHAIN_PAYLOADS,
  'srv--solana-testnet': SOLANATESTNET_PAYLOADS,
  'srv--soneium-minato': SONEIUMMINATO_PAYLOADS,
  'srv--sonic-blaze': SONICBLAZE_PAYLOADS,
  'srv--stargaze': STARGAZE_PAYLOADS,
  'srv--stride': STRIDE_PAYLOADS,
  'srv--syscoin-tanenbaum-evm': SYSCOINTANENBAUMEVM_PAYLOADS,
  'srv--taiko-hoodi': TAIKOHOODI_PAYLOADS,
  'srv--teritori': TERITORI_PAYLOADS,
  'srv--terra': TERRA_PAYLOADS,
  'srv--terra-classic': TERRACLASSIC_PAYLOADS,
  'srv--unichain-sepolia': UNICHAINSEPOLIA_PAYLOADS
}

