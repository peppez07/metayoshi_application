import { adaCoin } from './ada'
import { akashCoin } from './akash'
import { arbitrumSepoliaCoin } from './arbitrumSepolia'
import { arbCoin } from './arb'
import { atomoneCoin } from './atomone'
import { avalancheFujiCoin } from './avalancheFuji'
import { avaxcCoin } from './avaxc'
import { auroraCoin } from './aurora'
import { axelarCoin } from './axelar'
import { babylonCoin } from './babylon'
import { bahamutCoin } from './bahamut'
import { baseCoin } from './base'
import { baseSepoliaCoin } from './baseSepolia'
import { berachainCoin } from './berachain'
import { blastCoin } from './blast'
import { bnbCoin } from './bnb'
import { bnbTestnetCoin } from './bnbTestnet'
import { btcCoin } from './btc'
import { btczCoin } from './btcz'
import { bitcannaCoin } from './bitcanna'
import { celoCoin } from './celo'
import { celestiaCoin } from './celestia'
import { chihuahuaCoin } from './chihuahua'
import { comdexCoin } from './comdex'
import { coreumCoin } from './coreum'
import { cosmosCoin } from './cosmos'
import { croCoin } from './cro'
import { cronosCoin } from './cronos'
import { dashCoin } from './dash'
import { dogeCoin } from './doge'
import { dymensionEvmCoin } from './dymensionEvm'
import { dydxCoin } from './dydx'
import { elysCoin } from './elys'
import { ethCoin } from './eth'
import { ethereumSepoliaCoin } from './ethereumSepolia'
import { evmosEvmCoin } from './evmosEvm'
import { fetchCoin } from './fetch'
import { firoCoin } from './firo'
import { fraxtalCoin } from './fraxtal'
import { gnosisCoin } from './gnosis'
import { haqqCoin } from './haqq'
import { irisEvmCoin } from './irisEvm'
import { injectiveCoin } from './injective'
import { junoCoin } from './juno'
import { kavaEvmCoin } from './kavaEvm'
import { kujiraCoin } from './kujira'
import { lineaCoin } from './linea'
import { lumeraCoin } from './lumera'
import { mantleCoin } from './mantle'
import { mediblocCoin } from './medibloc'
import { metisCoin } from './metis'
import { moonbeamCoin } from './moonbeam'
import { moonriverCoin } from './moonriver'
import { nibiruEvmCoin } from './nibiruEvm'
import { neutronCoin } from './neutron'
import { nolusCoin } from './nolus'
import { opCoin } from './op'
import { optimismSepoliaCoin } from './optimismSepolia'
import { oraichainCoin } from './oraichain'
import { osmosisCoin } from './osmosis'
import { persistenceCoin } from './persistence'
import { passageCoin } from './passage'
import { polygonCoin } from './polygon'
import { polygonAmoyCoin } from './polygonAmoy'
import { pulsechainCoin } from './pulsechain'
import { rtmCoin } from './rtm'
import { quicksilverCoin } from './quicksilver'
import { regenCoin } from './regen'
import { scrollCoin } from './scroll'
import { sagaCoin } from './saga'
import { seiCoin } from './sei'
import { seiEvmCoin } from './seiEvm'
import { sentinelCoin } from './sentinel'
import { shentuCoin } from './shentu'
import { solCoin } from './sol'
import { somniaCoin } from './somnia'
import { soneiumCoin } from './soneium'
import { sonicCoin } from './sonic'
import { suiCoin } from './sui'
import { stargazeCoin } from './stargaze'
import { strideCoin } from './stride'
import { taikoCoin } from './taiko'
import { tenetEvmCoin } from './tenetEvm'
import { terraCoin } from './terra'
import { terraClassicCoin } from './terraClassic'
import { teritoriCoin } from './teritori'
import { tronCoin } from './tron'
import { unichainCoin } from './unichain'
import { wardenEvmCoin } from './wardenEvm'
import { xlmCoin } from './xlm'
import { xplaEvmCoin } from './xplaEvm'
import { zksyncCoin } from './zksync'
import type { BundledCoinRegistryEntry } from './registryTypes'

export const BUNDLED_COIN_REGISTRY: BundledCoinRegistryEntry[] = [
  {
    manifest: {
      id: 'rtm',
      runtimeModelId: 'rtm',
      protocolFamily: 'utxo',
      coinId: 'raptoreum',
      chain: 'main',
      aliases: ['rtm', 'raptoreum'],
      testedByDefault: true,
      visibleByDefault: true
    },
    coin: rtmCoin
  },
  {
    manifest: {
      id: 'srv--bitcoin',
      runtimeModelId: 'srv--bitcoin',
      protocolFamily: 'utxo',
      coinId: 'bitcoin',
      chain: 'main',
      aliases: ['srv--bitcoin', 'srv--btc', 'btc', 'bitcoin'],
      testedByDefault: true,
      visibleByDefault: true
    },
    coin: btcCoin
  },
  {
    manifest: {
      id: 'atomone',
      runtimeModelId: 'atomone',
      protocolFamily: 'cosmos',
      coinId: 'atomone',
      chain: 'main',
      aliases: ['atomone', 'atomone-mainnet', 'mainnet-atomone'],
      visibleByDefault: true
    },
    coin: atomoneCoin
  },
  {
    manifest: {
      id: 'akash',
      runtimeModelId: 'akash',
      protocolFamily: 'cosmos',
      coinId: 'akash',
      chain: 'main',
      aliases: ['akash', 'akash-mainnet', 'mainnet-akash'],
      visibleByDefault: true
    },
    coin: akashCoin
  },
  {
    manifest: {
      id: 'eth',
      runtimeModelId: 'eth',
      protocolFamily: 'evm',
      coinId: 'ethereum',
      chain: 'main',
      aliases: ['eth', 'ethereum', 'srv--ethereum', 'ethereum-mainnet', 'mainnet-ethereum'],
      chainId: 1,
      includeInEvmSet: true,
      testedByDefault: true,
      visibleByDefault: true
    },
    coin: ethCoin
  },
  {
    manifest: {
      id: 'ethereum-sepolia',
      runtimeModelId: 'eth',
      protocolFamily: 'evm',
      coinId: 'ethereum-sepolia',
      chain: 'test',
      aliases: ['ethereum-sepolia', 'eth-sepolia', 'sepolia', 'sepolia-eth', 'testnet-ethereum'],
      chainId: 11155111,
      includeInEvmSet: true,
      testedByDefault: true,
      visibleByDefault: true
    },
    coin: ethereumSepoliaCoin
  },
  {
    manifest: {
      id: 'berachain',
      runtimeModelId: 'berachain',
      protocolFamily: 'evm',
      coinId: 'berachain',
      chain: 'main',
      aliases: ['berachain', 'berachain-mainnet', 'mainnet-berachain'],
      chainId: 80094,
      includeInEvmSet: true,
      visibleByDefault: true
    },
    coin: berachainCoin
  },
  {
    manifest: {
      id: 'axelar',
      runtimeModelId: 'axelar',
      protocolFamily: 'cosmos',
      coinId: 'axelar',
      chain: 'main',
      aliases: ['axelar', 'axelar-mainnet', 'mainnet-axelar'],
      visibleByDefault: true
    },
    coin: axelarCoin
  },
  {
    manifest: {
      id: 'babylon',
      runtimeModelId: 'babylon',
      protocolFamily: 'cosmos',
      coinId: 'babylon',
      chain: 'main',
      aliases: ['babylon', 'babylon-mainnet', 'mainnet-babylon'],
      visibleByDefault: true
    },
    coin: babylonCoin
  },
  {
    manifest: {
      id: 'blast',
      runtimeModelId: 'blast',
      protocolFamily: 'evm',
      coinId: 'blast',
      chain: 'main',
      aliases: ['blast', 'blast-mainnet', 'mainnet-blast'],
      chainId: 81457,
      includeInEvmSet: true,
      isEthereumLayer2: true,
      visibleByDefault: true
    },
    coin: blastCoin
  },
  {
    manifest: {
      id: 'bitcanna',
      runtimeModelId: 'bitcanna',
      protocolFamily: 'cosmos',
      coinId: 'bitcanna',
      chain: 'main',
      aliases: ['bitcanna', 'bitcanna-mainnet', 'mainnet-bitcanna']
    },
    coin: bitcannaCoin
  },
  {
    manifest: {
      id: 'bnb',
      runtimeModelId: 'bnb',
      protocolFamily: 'evm',
      coinId: 'bsc',
      chain: 'main',
      aliases: [
        'bnb',
        'bsc',
        'srv--bnb',
        'bnb-mainnet',
        'mainnet-bnb',
        'bsc-mainnet',
        'mainnet-bsc',
        'bnb-smart-chain',
        'binance-smart-chain',
        'bnb-smart-chain-mainnet',
        'binance-smart-chain-mainnet'
      ],
      chainId: 56,
      includeInEvmSet: true,
      testedByDefault: true,
      visibleByDefault: true
    },
    coin: bnbCoin
  },
  {
    manifest: {
      id: 'bnb-testnet',
      runtimeModelId: 'bnb',
      protocolFamily: 'evm',
      coinId: 'bsc-testnet',
      chain: 'test',
      aliases: [
        'bnb-testnet',
        'bnbt',
        'bsc-testnet',
        'chapel',
        'testnet-bnb',
        'bnb-smart-chain-testnet',
        'binance-smart-chain-testnet'
      ],
      chainId: 97,
      testedByDefault: true
    },
    coin: bnbTestnetCoin
  },
  {
    manifest: {
      id: 'base-sepolia',
      runtimeModelId: 'base',
      protocolFamily: 'evm',
      coinId: 'base-sepolia',
      chain: 'test',
      aliases: ['base-sepolia', 'sepolia-base', 'base-testnet', 'testnet-base'],
      chainId: 84532,
      includeInEvmSet: true,
      isEthereumLayer2: true,
      visibleByDefault: true
    },
    coin: baseSepoliaCoin
  },
  {
    manifest: {
      id: 'arb',
      runtimeModelId: 'arb',
      protocolFamily: 'evm',
      coinId: 'arbitrum-one',
      chain: 'main',
      aliases: ['arb', 'arbitrum', 'arbitrum-one', 'mainnet-arbitrum'],
      chainId: 42161,
      includeInEvmSet: true,
      isEthereumLayer2: true,
      visibleByDefault: true
    },
    coin: arbCoin
  },
  {
    manifest: {
      id: 'arbitrum-sepolia',
      runtimeModelId: 'arb',
      protocolFamily: 'evm',
      coinId: 'arbitrum-sepolia',
      chain: 'test',
      aliases: ['arbitrum-sepolia', 'arb-sepolia', 'arbitrum-testnet', 'testnet-arbitrum'],
      chainId: 421614,
      includeInEvmSet: true,
      isEthereumLayer2: true,
      visibleByDefault: true
    },
    coin: arbitrumSepoliaCoin
  },
  {
    manifest: {
      id: 'op',
      runtimeModelId: 'op',
      protocolFamily: 'evm',
      coinId: 'optimism',
      chain: 'main',
      aliases: ['op', 'optimism', 'optimism-mainnet', 'mainnet-optimism', 'eth-l2--optimism'],
      chainId: 10,
      includeInEvmSet: true,
      isEthereumLayer2: true,
      visibleByDefault: true
    },
    coin: opCoin
  },
  {
    manifest: {
      id: 'optimism-sepolia',
      runtimeModelId: 'op',
      protocolFamily: 'evm',
      coinId: 'optimism-sepolia',
      chain: 'test',
      aliases: ['optimism-sepolia', 'op-sepolia', 'optimism-testnet', 'testnet-optimism'],
      chainId: 11155420,
      includeInEvmSet: true,
      isEthereumLayer2: true,
      visibleByDefault: true
    },
    coin: optimismSepoliaCoin
  },
  {
    manifest: {
      id: 'base',
      runtimeModelId: 'base',
      protocolFamily: 'evm',
      coinId: 'base',
      chain: 'main',
      aliases: ['base', 'srv--base', 'base-mainnet', 'mainnet-base'],
      chainId: 8453,
      includeInEvmSet: true,
      isEthereumLayer2: true,
      testedByDefault: true,
      visibleByDefault: true
    },
    coin: baseCoin
  },
  {
    manifest: {
      id: 'polygon',
      runtimeModelId: 'polygon',
      protocolFamily: 'evm',
      coinId: 'polygon-bor',
      chain: 'main',
      aliases: ['polygon', 'polygon-pos', 'polygon-mainnet', 'polygon-bor', 'mainnet-polygon'],
      chainId: 137,
      includeInEvmSet: true,
      visibleByDefault: true
    },
    coin: polygonCoin
  },
  {
    manifest: {
      id: 'polygon-amoy',
      runtimeModelId: 'polygon',
      protocolFamily: 'evm',
      coinId: 'polygon-amoy-bor',
      chain: 'test',
      aliases: ['polygon-amoy', 'polygon-amoy-bor', 'amoy', 'polygon-testnet', 'testnet-polygon'],
      chainId: 80002,
      includeInEvmSet: true,
      visibleByDefault: true
    },
    coin: polygonAmoyCoin
  },
  {
    manifest: {
      id: 'avaxc',
      runtimeModelId: 'avaxc',
      protocolFamily: 'evm',
      coinId: 'avalanche-c-chain',
      chain: 'main',
      aliases: ['avax', 'avaxc', 'avalanche', 'avalanche-c-chain', 'mainnet-avalanche'],
      chainId: 43114,
      includeInEvmSet: true,
      visibleByDefault: true
    },
    coin: avaxcCoin
  },
  {
    manifest: {
      id: 'avalanche-fuji',
      runtimeModelId: 'avaxc',
      protocolFamily: 'evm',
      coinId: 'avalanche-fuji-c-chain',
      chain: 'test',
      aliases: ['avalanche-fuji', 'avalanche-fuji-c-chain', 'fuji', 'fuji-c-chain', 'avalanche-testnet'],
      chainId: 43113,
      includeInEvmSet: true,
      visibleByDefault: true
    },
    coin: avalancheFujiCoin
  },
  {
    manifest: {
      id: 'aurora',
      runtimeModelId: 'aurora',
      protocolFamily: 'evm',
      coinId: 'aurora',
      chain: 'main',
      aliases: ['aurora', 'aurora-mainnet', 'mainnet-aurora'],
      chainId: 1313161554,
      includeInEvmSet: true,
      isEthereumLayer2: true,
      testedByDefault: true
    },
    coin: auroraCoin
  },
  {
    manifest: {
      id: 'bahamut',
      runtimeModelId: 'bahamut',
      protocolFamily: 'evm',
      coinId: 'bahamut',
      chain: 'main',
      aliases: ['bahamut', 'bahamut-mainnet', 'mainnet-bahamut', 'ftn'],
      chainId: 5165,
      includeInEvmSet: true,
      testedByDefault: true
    },
    coin: bahamutCoin
  },
  {
    manifest: {
      id: 'celo',
      runtimeModelId: 'celo',
      protocolFamily: 'evm',
      coinId: 'celo',
      chain: 'main',
      aliases: ['celo', 'celo-mainnet', 'mainnet-celo'],
      chainId: 42220,
      includeInEvmSet: true,
      visibleByDefault: true
    },
    coin: celoCoin
  },
  {
    manifest: {
      id: 'cronos',
      runtimeModelId: 'cronos',
      protocolFamily: 'evm',
      coinId: 'cronos',
      chain: 'main',
      aliases: ['cronos', 'cronos-mainnet', 'cronos-evm', 'mainnet-cronos'],
      chainId: 25,
      includeInEvmSet: true,
      visibleByDefault: true
    },
    coin: cronosCoin
  },
  {
    manifest: {
      id: 'fraxtal',
      runtimeModelId: 'fraxtal',
      protocolFamily: 'evm',
      coinId: 'fraxtal',
      chain: 'main',
      aliases: ['fraxtal', 'fraxtal-mainnet', 'mainnet-fraxtal'],
      chainId: 252,
      includeInEvmSet: true,
      isEthereumLayer2: true,
      visibleByDefault: true
    },
    coin: fraxtalCoin
  },
  {
    manifest: {
      id: 'gnosis',
      runtimeModelId: 'gnosis',
      protocolFamily: 'evm',
      coinId: 'gnosis',
      chain: 'main',
      aliases: ['gnosis', 'gnosis-chain', 'xdai', 'mainnet-gnosis'],
      chainId: 100,
      includeInEvmSet: true,
      testedByDefault: true
    },
    coin: gnosisCoin
  },
  {
    manifest: {
      id: 'haqq',
      runtimeModelId: 'haqq',
      protocolFamily: 'evm',
      coinId: 'haqq',
      chain: 'main',
      aliases: ['haqq', 'haqq-mainnet', 'haqq-evm', 'mainnet-haqq'],
      chainId: 11235,
      includeInEvmSet: true,
      visibleByDefault: true
    },
    coin: haqqCoin
  },
  {
    manifest: {
      id: 'linea',
      runtimeModelId: 'linea',
      protocolFamily: 'evm',
      coinId: 'linea',
      chain: 'main',
      aliases: ['linea', 'linea-mainnet', 'mainnet-linea'],
      chainId: 59144,
      includeInEvmSet: true,
      isEthereumLayer2: true,
      visibleByDefault: true
    },
    coin: lineaCoin
  },
  {
    manifest: {
      id: 'mantle',
      runtimeModelId: 'mantle',
      protocolFamily: 'evm',
      coinId: 'mantle',
      chain: 'main',
      aliases: ['mantle', 'mantle-mainnet', 'mainnet-mantle'],
      chainId: 5000,
      includeInEvmSet: true,
      isEthereumLayer2: true,
      visibleByDefault: true
    },
    coin: mantleCoin
  },
  {
    manifest: {
      id: 'metis',
      runtimeModelId: 'metis',
      protocolFamily: 'evm',
      coinId: 'metis',
      chain: 'main',
      aliases: ['metis', 'metis-mainnet', 'mainnet-metis'],
      chainId: 1088,
      includeInEvmSet: true,
      isEthereumLayer2: true,
      visibleByDefault: true
    },
    coin: metisCoin
  },
  {
    manifest: {
      id: 'moonbeam',
      runtimeModelId: 'moonbeam',
      protocolFamily: 'evm',
      coinId: 'moonbeam',
      chain: 'main',
      aliases: ['moonbeam', 'moonbeam-mainnet', 'mainnet-moonbeam'],
      chainId: 1284,
      includeInEvmSet: true,
      visibleByDefault: true
    },
    coin: moonbeamCoin
  },
  {
    manifest: {
      id: 'moonriver',
      runtimeModelId: 'moonriver',
      protocolFamily: 'evm',
      coinId: 'moonriver',
      chain: 'main',
      aliases: ['moonriver', 'moonriver-mainnet', 'mainnet-moonriver'],
      chainId: 1285,
      includeInEvmSet: true,
      visibleByDefault: true
    },
    coin: moonriverCoin
  },
  {
    manifest: {
      id: 'dymension-evm',
      runtimeModelId: 'dymension-evm',
      protocolFamily: 'evm',
      coinId: 'dymension-evm',
      chain: 'main',
      aliases: ['dymension-evm', 'dymension-evm-mainnet', 'mainnet-dymension-evm'],
      chainId: 1100,
      includeInEvmSet: true,
      visibleByDefault: true
    },
    coin: dymensionEvmCoin
  },
  {
    manifest: {
      id: 'dydx',
      runtimeModelId: 'dydx',
      protocolFamily: 'cosmos',
      coinId: 'dydx',
      chain: 'main',
      aliases: ['dydx', 'dydx-mainnet', 'mainnet-dydx'],
      visibleByDefault: true
    },
    coin: dydxCoin
  },
  {
    manifest: {
      id: 'elys',
      runtimeModelId: 'elys',
      protocolFamily: 'cosmos',
      coinId: 'elys',
      chain: 'main',
      aliases: ['elys', 'elys-mainnet', 'mainnet-elys']
    },
    coin: elysCoin
  },
  {
    manifest: {
      id: 'celestia',
      runtimeModelId: 'celestia',
      protocolFamily: 'cosmos',
      coinId: 'celestia',
      chain: 'main',
      aliases: ['celestia', 'celestia-mainnet', 'mainnet-celestia'],
      visibleByDefault: true
    },
    coin: celestiaCoin
  },
  {
    manifest: {
      id: 'chihuahua',
      runtimeModelId: 'chihuahua',
      protocolFamily: 'cosmos',
      coinId: 'chihuahua',
      chain: 'main',
      aliases: ['chihuahua', 'chihuahua-mainnet', 'mainnet-chihuahua']
    },
    coin: chihuahuaCoin
  },
  {
    manifest: {
      id: 'comdex',
      runtimeModelId: 'comdex',
      protocolFamily: 'cosmos',
      coinId: 'comdex',
      chain: 'main',
      aliases: ['comdex', 'comdex-mainnet', 'mainnet-comdex']
    },
    coin: comdexCoin
  },
  {
    manifest: {
      id: 'coreum',
      runtimeModelId: 'coreum',
      protocolFamily: 'cosmos',
      coinId: 'coreum',
      chain: 'main',
      aliases: ['coreum', 'coreum-mainnet', 'mainnet-coreum']
    },
    coin: coreumCoin
  },
  {
    manifest: {
      id: 'cosmos',
      runtimeModelId: 'cosmos',
      protocolFamily: 'cosmos',
      coinId: 'cosmos',
      chain: 'main',
      aliases: ['cosmos', 'cosmos-hub'],
      testedByDefault: true,
      visibleByDefault: true
    },
    coin: cosmosCoin
  },
  {
    manifest: {
      id: 'cro',
      runtimeModelId: 'cro',
      protocolFamily: 'cosmos',
      coinId: 'cronos-pos',
      chain: 'main',
      aliases: ['cro', 'cronos-pos', 'crocosmos'],
      visibleByDefault: true
    },
    coin: croCoin
  },
  {
    manifest: {
      id: 'tron',
      runtimeModelId: 'tron',
      protocolFamily: 'tron',
      coinId: 'tron',
      chain: 'main',
      aliases: ['trx', 'tron']
    },
    coin: tronCoin
  },
  {
    manifest: {
      id: 'evmos-evm',
      runtimeModelId: 'evmos-evm',
      protocolFamily: 'evm',
      coinId: 'evmos-evm',
      chain: 'main',
      aliases: ['evmos-evm', 'evmos-evm-mainnet', 'mainnet-evmos-evm'],
      chainId: 9001,
      includeInEvmSet: true,
      visibleByDefault: true
    },
    coin: evmosEvmCoin
  },
  {
    manifest: {
      id: 'fetch',
      runtimeModelId: 'fetch',
      protocolFamily: 'cosmos',
      coinId: 'fetch',
      chain: 'main',
      aliases: ['fetch', 'fetch-mainnet', 'mainnet-fetch', 'fetchhub'],
      visibleByDefault: true
    },
    coin: fetchCoin
  },
  {
    manifest: {
      id: 'injective',
      runtimeModelId: 'injective',
      protocolFamily: 'cosmos',
      coinId: 'injective',
      chain: 'main',
      aliases: ['injective', 'injective-mainnet', 'mainnet-injective'],
      visibleByDefault: true
    },
    coin: injectiveCoin
  },
  {
    manifest: {
      id: 'juno',
      runtimeModelId: 'juno',
      protocolFamily: 'cosmos',
      coinId: 'juno',
      chain: 'main',
      aliases: ['juno', 'juno-mainnet', 'mainnet-juno']
    },
    coin: junoCoin
  },
  {
    manifest: {
      id: 'kujira',
      runtimeModelId: 'kujira',
      protocolFamily: 'cosmos',
      coinId: 'kujira',
      chain: 'main',
      aliases: ['kujira', 'kujira-mainnet', 'mainnet-kujira']
    },
    coin: kujiraCoin
  },
  {
    manifest: {
      id: 'pulsechain',
      runtimeModelId: 'pulsechain',
      protocolFamily: 'evm',
      coinId: 'pulsechain',
      chain: 'main',
      aliases: ['pulsechain', 'pulsechain-mainnet', 'mainnet-pulsechain'],
      chainId: 369,
      includeInEvmSet: true,
      visibleByDefault: true
    },
    coin: pulsechainCoin
  },
  {
    manifest: {
      id: 'scroll',
      runtimeModelId: 'scroll',
      protocolFamily: 'evm',
      coinId: 'scroll',
      chain: 'main',
      aliases: ['scroll', 'scroll-mainnet', 'mainnet-scroll'],
      chainId: 534352,
      includeInEvmSet: true,
      isEthereumLayer2: true,
      visibleByDefault: true
    },
    coin: scrollCoin
  },
  {
    manifest: {
      id: 'saga',
      runtimeModelId: 'saga',
      protocolFamily: 'cosmos',
      coinId: 'saga',
      chain: 'main',
      aliases: ['saga', 'saga-mainnet', 'mainnet-saga']
    },
    coin: sagaCoin
  },
  {
    manifest: {
      id: 'iris-evm',
      runtimeModelId: 'iris-evm',
      protocolFamily: 'evm',
      coinId: 'iris-evm',
      chain: 'main',
      aliases: ['iris', 'iris-evm', 'iris-mainnet', 'mainnet-iris'],
      chainId: 6688,
      includeInEvmSet: true,
      visibleByDefault: true
    },
    coin: irisEvmCoin
  },
  {
    manifest: {
      id: 'kava-evm',
      runtimeModelId: 'kava-evm',
      protocolFamily: 'evm',
      coinId: 'kava-evm',
      chain: 'main',
      aliases: ['kava', 'kava-evm', 'kava-mainnet', 'mainnet-kava'],
      chainId: 2222,
      includeInEvmSet: true,
      visibleByDefault: true
    },
    coin: kavaEvmCoin
  },
  {
    manifest: {
      id: 'lumera',
      runtimeModelId: 'lumera',
      protocolFamily: 'cosmos',
      coinId: 'lumera',
      chain: 'main',
      aliases: ['lumera', 'lumera-mainnet', 'mainnet-lumera']
    },
    coin: lumeraCoin
  },
  {
    manifest: {
      id: 'medibloc',
      runtimeModelId: 'medibloc',
      protocolFamily: 'cosmos',
      coinId: 'medibloc',
      chain: 'main',
      aliases: ['medibloc', 'medibloc-mainnet', 'mainnet-medibloc', 'panacea']
    },
    coin: mediblocCoin
  },
  {
    manifest: {
      id: 'neutron',
      runtimeModelId: 'neutron',
      protocolFamily: 'cosmos',
      coinId: 'neutron',
      chain: 'main',
      aliases: ['neutron', 'neutron-mainnet', 'mainnet-neutron']
    },
    coin: neutronCoin
  },
  {
    manifest: {
      id: 'nolus',
      runtimeModelId: 'nolus',
      protocolFamily: 'cosmos',
      coinId: 'nolus',
      chain: 'main',
      aliases: ['nolus', 'nolus-mainnet', 'mainnet-nolus']
    },
    coin: nolusCoin
  },
  {
    manifest: {
      id: 'oraichain',
      runtimeModelId: 'oraichain',
      protocolFamily: 'cosmos',
      coinId: 'oraichain',
      chain: 'main',
      aliases: ['oraichain', 'oraichain-mainnet', 'mainnet-oraichain']
    },
    coin: oraichainCoin
  },
  {
    manifest: {
      id: 'osmosis',
      runtimeModelId: 'osmosis',
      protocolFamily: 'cosmos',
      coinId: 'osmosis',
      chain: 'main',
      aliases: ['osmosis', 'osmosis-mainnet', 'mainnet-osmosis'],
      visibleByDefault: true
    },
    coin: osmosisCoin
  },
  {
    manifest: {
      id: 'persistence',
      runtimeModelId: 'persistence',
      protocolFamily: 'cosmos',
      coinId: 'persistence',
      chain: 'main',
      aliases: ['persistence', 'persistence-mainnet', 'mainnet-persistence']
    },
    coin: persistenceCoin
  },
  {
    manifest: {
      id: 'passage',
      runtimeModelId: 'passage',
      protocolFamily: 'cosmos',
      coinId: 'passage',
      chain: 'main',
      aliases: ['passage', 'passage-mainnet', 'mainnet-passage']
    },
    coin: passageCoin
  },
  {
    manifest: {
      id: 'quicksilver',
      runtimeModelId: 'quicksilver',
      protocolFamily: 'cosmos',
      coinId: 'quicksilver',
      chain: 'main',
      aliases: ['quicksilver', 'quicksilver-mainnet', 'mainnet-quicksilver']
    },
    coin: quicksilverCoin
  },
  {
    manifest: {
      id: 'regen',
      runtimeModelId: 'regen',
      protocolFamily: 'cosmos',
      coinId: 'regen',
      chain: 'main',
      aliases: ['regen', 'regen-mainnet', 'mainnet-regen']
    },
    coin: regenCoin
  },
  {
    manifest: {
      id: 'sol',
      runtimeModelId: 'sol',
      protocolFamily: 'solana',
      coinId: 'solana',
      chain: 'main',
      aliases: ['sol', 'solana'],
      testedByDefault: true,
      visibleByDefault: true
    },
    coin: solCoin
  },
  {
    manifest: {
      id: 'nibiru-evm',
      runtimeModelId: 'nibiru-evm',
      protocolFamily: 'evm',
      coinId: 'nibiru-evm',
      chain: 'main',
      aliases: ['nibiru', 'nibiru-evm', 'nibiru-mainnet', 'mainnet-nibiru'],
      chainId: 6900,
      includeInEvmSet: true,
      visibleByDefault: true
    },
    coin: nibiruEvmCoin
  },
  {
    manifest: {
      id: 'sei-evm',
      runtimeModelId: 'sei-evm',
      protocolFamily: 'evm',
      coinId: 'sei-evm',
      chain: 'main',
      aliases: ['sei-evm', 'sei-evm-mainnet', 'mainnet-sei-evm'],
      chainId: 1329,
      includeInEvmSet: true,
      visibleByDefault: true
    },
    coin: seiEvmCoin
  },
  {
    manifest: {
      id: 'sentinel',
      runtimeModelId: 'sentinel',
      protocolFamily: 'cosmos',
      coinId: 'sentinel',
      chain: 'main',
      aliases: ['sentinel', 'sentinel-mainnet', 'mainnet-sentinel']
    },
    coin: sentinelCoin
  },
  {
    manifest: {
      id: 'shentu',
      runtimeModelId: 'shentu',
      protocolFamily: 'cosmos',
      coinId: 'shentu',
      chain: 'main',
      aliases: ['shentu', 'shentu-mainnet', 'mainnet-shentu']
    },
    coin: shentuCoin
  },
  {
    manifest: {
      id: 'sei',
      runtimeModelId: 'sei',
      protocolFamily: 'cosmos',
      coinId: 'sei',
      chain: 'main',
      aliases: ['sei', 'sei-mainnet', 'mainnet-sei'],
      visibleByDefault: true
    },
    coin: seiCoin
  },
  {
    manifest: {
      id: 'stargaze',
      runtimeModelId: 'stargaze',
      protocolFamily: 'cosmos',
      coinId: 'stargaze',
      chain: 'main',
      aliases: ['stargaze', 'stargaze-mainnet', 'mainnet-stargaze']
    },
    coin: stargazeCoin
  },
  {
    manifest: {
      id: 'stride',
      runtimeModelId: 'stride',
      protocolFamily: 'cosmos',
      coinId: 'stride',
      chain: 'main',
      aliases: ['stride', 'stride-mainnet', 'mainnet-stride']
    },
    coin: strideCoin
  },
  {
    manifest: {
      id: 'taiko',
      runtimeModelId: 'taiko',
      protocolFamily: 'evm',
      coinId: 'taiko',
      chain: 'main',
      aliases: ['taiko', 'taiko-mainnet', 'mainnet-taiko'],
      chainId: 167000,
      includeInEvmSet: true,
      isEthereumLayer2: true,
      visibleByDefault: true
    },
    coin: taikoCoin
  },
  {
    manifest: {
      id: 'terra',
      runtimeModelId: 'terra',
      protocolFamily: 'cosmos',
      coinId: 'terra',
      chain: 'main',
      aliases: ['terra', 'terra-mainnet', 'mainnet-terra']
    },
    coin: terraCoin
  },
  {
    manifest: {
      id: 'terra-classic',
      runtimeModelId: 'terra-classic',
      protocolFamily: 'cosmos',
      coinId: 'terra-classic',
      chain: 'main',
      aliases: ['terra-classic', 'terra-classic-mainnet', 'mainnet-terra-classic', 'lunc'],
      visibleByDefault: true
    },
    coin: terraClassicCoin
  },
  {
    manifest: {
      id: 'teritori',
      runtimeModelId: 'teritori',
      protocolFamily: 'cosmos',
      coinId: 'teritori',
      chain: 'main',
      aliases: ['teritori', 'teritori-mainnet', 'mainnet-teritori']
    },
    coin: teritoriCoin
  },
  {
    manifest: {
      id: 'tenet-evm',
      runtimeModelId: 'tenet-evm',
      protocolFamily: 'evm',
      coinId: 'tenet-evm',
      chain: 'main',
      aliases: ['tenet', 'tenet-evm', 'tenet-mainnet', 'mainnet-tenet'],
      chainId: 1559,
      includeInEvmSet: true,
      visibleByDefault: true
    },
    coin: tenetEvmCoin
  },
  {
    manifest: {
      id: 'ada',
      runtimeModelId: 'ada',
      protocolFamily: 'cardano',
      coinId: 'cardano',
      chain: 'main',
      aliases: ['ada', 'cardano']
    },
    coin: adaCoin
  },
  {
    manifest: {
      id: 'somnia',
      runtimeModelId: 'somnia',
      protocolFamily: 'evm',
      coinId: 'somnia',
      chain: 'main',
      aliases: ['somnia', 'somnia-mainnet', 'mainnet-somnia'],
      chainId: 5031,
      includeInEvmSet: true,
      visibleByDefault: true
    },
    coin: somniaCoin
  },
  {
    manifest: {
      id: 'soneium',
      runtimeModelId: 'soneium',
      protocolFamily: 'evm',
      coinId: 'soneium',
      chain: 'main',
      aliases: ['soneium', 'soneium-mainnet', 'mainnet-soneium'],
      chainId: 1868,
      includeInEvmSet: true,
      isEthereumLayer2: true,
      visibleByDefault: true
    },
    coin: soneiumCoin
  },
  {
    manifest: {
      id: 'sonic',
      runtimeModelId: 'sonic',
      protocolFamily: 'evm',
      coinId: 'sonic',
      chain: 'main',
      aliases: ['sonic', 'sonic-mainnet', 'mainnet-sonic'],
      chainId: 146,
      includeInEvmSet: true,
      visibleByDefault: true
    },
    coin: sonicCoin
  },
  {
    manifest: {
      id: 'sui',
      runtimeModelId: 'sui',
      protocolFamily: 'sui',
      coinId: 'sui',
      chain: 'main',
      aliases: ['sui'],
      testedByDefault: true
    },
    coin: suiCoin
  },
  {
    manifest: {
      id: 'warden-evm',
      runtimeModelId: 'warden-evm',
      protocolFamily: 'evm',
      coinId: 'warden-evm',
      chain: 'main',
      aliases: ['warden', 'warden-evm', 'warden-mainnet', 'mainnet-warden'],
      chainId: 8765,
      includeInEvmSet: true,
      visibleByDefault: true
    },
    coin: wardenEvmCoin
  },
  {
    manifest: {
      id: 'unichain',
      runtimeModelId: 'unichain',
      protocolFamily: 'evm',
      coinId: 'unichain',
      chain: 'main',
      aliases: ['unichain', 'unichain-mainnet', 'mainnet-unichain'],
      chainId: 130,
      includeInEvmSet: true,
      isEthereumLayer2: true,
      visibleByDefault: true
    },
    coin: unichainCoin
  },
  {
    manifest: {
      id: 'xpla-evm',
      runtimeModelId: 'xpla-evm',
      protocolFamily: 'evm',
      coinId: 'xpla-evm',
      chain: 'main',
      aliases: ['xpla', 'xpla-evm', 'xpla-mainnet', 'mainnet-xpla'],
      chainId: 37,
      includeInEvmSet: true,
      visibleByDefault: true
    },
    coin: xplaEvmCoin
  },
  {
    manifest: {
      id: 'xlm',
      runtimeModelId: 'xlm',
      protocolFamily: 'stellar',
      coinId: 'stellar',
      chain: 'main',
      aliases: ['xlm', 'stellar']
    },
    coin: xlmCoin
  },
  {
    manifest: {
      id: 'doge',
      runtimeModelId: 'doge',
      protocolFamily: 'utxo',
      coinId: 'dogecoin',
      chain: 'main',
      aliases: ['doge', 'dogecoin']
    },
    coin: dogeCoin
  },
  {
    manifest: {
      id: 'firo',
      runtimeModelId: 'firo',
      protocolFamily: 'utxo',
      coinId: 'firo',
      chain: 'main',
      aliases: ['firo']
    },
    coin: firoCoin
  },
  {
    manifest: {
      id: 'dash',
      runtimeModelId: 'dash',
      protocolFamily: 'utxo',
      coinId: 'dash',
      chain: 'main',
      aliases: ['dash', 'sdash', 'srv--dash'],
      testedByDefault: true,
      visibleByDefault: true
    },
    coin: dashCoin
  },
  {
    manifest: {
      id: 'btcz',
      runtimeModelId: 'btcz',
      protocolFamily: 'utxo',
      coinId: 'bitcoinz',
      chain: 'main',
      aliases: ['btcz', 'bitcoinz'],
      testedByDefault: true,
      visibleByDefault: true
    },
    coin: btczCoin
  },
  {
    manifest: {
      id: 'zksync',
      runtimeModelId: 'zksync',
      protocolFamily: 'evm',
      coinId: 'zksync-era',
      chain: 'main',
      aliases: ['zksync', 'zksync-era', 'zksync-mainnet', 'mainnet-zksync'],
      chainId: 324,
      includeInEvmSet: true,
      isEthereumLayer2: true,
      visibleByDefault: true
    },
    coin: zksyncCoin
  }
]
