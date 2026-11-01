/**
 * Coin catalog generated from ElectrumX coins.py (spesmilo 1.20.0; WIF bytes
 * from 1.18.0) and SLIP-0044. See docs/MULTICOIN_PLAN.md. Address and WIF
 * bytes are hex; genesis hashes are block hashes as ElectrumX reports them.
 * Address bytes, bech32 prefixes, dust limits and minimum fees were
 * cross-checked against Trezor firmware common/defs/bitcoin and the coininfo
 * package; CRW (3-byte prefixes), DGB (P2SH 0x3f) and FJC (bech32 fc) follow
 * Trezor where ElectrumX was out of date.
 * knownServers are the TCP/SSL peers ElectrumX lists ("s" = SSL port, "t" =
 * TCP); browsers cannot use them directly. servers are secure WebSocket
 * (wss://) endpoints with browser-trusted certificates, checked live, that the
 * wallet uses by default.
 */
export type CoinFamily = 'legacy' | 'zcash' | 'forkid' | 'txtime' | 'txtime-end' | 'special'

export interface CatalogCoin {
  id: string
  name: string
  symbol: string
  family: CoinFamily
  decimals?: number
  /** SLIP-44 coin type; null when none is registered. */
  coinType: number | null
  p2pkh: string
  p2sh: string[]
  wif: string
  genesis: string
  /** [height, block hash] after a split from coins with the same genesis; see NetworkParams.checkpoint. */
  checkpoint?: [number, string]
  headerTimeOffset?: number
  segwit?: boolean
  /** Bech32 human-readable part, for sending to native SegWit addresses. */
  hrp?: string
  explorer?: string
  /** Smallest output the coin relays, in base units. */
  dust?: string
  /**
   * Lowest fee rate the wallet pays, in base units per kilobyte (Trezor firmware
   * defs). DOGE uses Dogecoin Core's recommended 0.01 DOGE/kB: nodes relay
   * 0.001 DOGE/kB, but recent blocks hold almost nothing paying less than 0.01.
   */
  minFeeKb?: number
  /** Largest fee the wallet will sign, in base units; 0.1 coin when unset. */
  maxFee?: string
  knownServers?: string[]
  /** Default browser servers (wss://). */
  servers?: string[]
}

export const CATALOG: CatalogCoin[] = [
  { id: "acc", name: "Adcoin", symbol: "ACC", family: "legacy", coinType: 161, p2pkh: "1e", p2sh: ["0d"], wif: "97", genesis: "000000fc5276647fd959f718c9526f87f4858c4ef62f2e29d3772e4e37040a25" },
  { id: "arg", name: "Argentum", symbol: "ARG", family: "legacy", coinType: 45, p2pkh: "17", p2sh: ["05"], wif: "97", genesis: "88c667bc63167685e4e4da058fffdfe8e007e5abffd6855de52ad59df7bb0bb2" },
  { id: "aya", name: "Aryacoin", symbol: "AYA", family: "legacy", coinType: 357, p2pkh: "17", p2sh: ["6f"], wif: "b0", genesis: "b553727635006d7faade229d152482dfb9da7822d41cf0cad9ffa82a54f67803", segwit: true },
  { id: "aur", name: "Auroracoin", symbol: "AUR", family: "legacy", coinType: 85, p2pkh: "17", p2sh: ["05"], wif: "b0", genesis: "2a8e100939494904af825b488596ddd536b3a96226ad02e0f7ab7ae472b27a8e" },
  { id: "axe", name: "AXE", symbol: "AXE", family: "legacy", coinType: 4242, p2pkh: "37", p2sh: ["10"], wif: "cc", genesis: "00000c33631ca6f2f61368991ce2dc03306b5bb50bf7cede5cfbba6db38e52e6", dust: "5460" },
  { id: "bta", name: "Bata", symbol: "BTA", family: "legacy", coinType: 89, p2pkh: "19", p2sh: ["05"], wif: "99", genesis: "b4bee36fd54a6176fd832f462641415c142d50e4b378f71c041870c2b1186bc8", segwit: true },
  { id: "bynd", name: "Beyondcoin", symbol: "BYND", family: "legacy", coinType: 536, p2pkh: "19", p2sh: ["1a", "05"], wif: "b0", genesis: "0a9e3b5fce3aee6e04f06dfd6ad380a6c0f9d8420f53a4ca97845756ee5d56e7", segwit: true },
  { id: "bay", name: "BitBay", symbol: "BAY", family: "txtime", coinType: 2125, p2pkh: "19", p2sh: ["55"], wif: "99", genesis: "0000075685d3be1f253ce777174b1594354e79954d2a32a6f77fe9cba00e6467" },
  { id: "btc", name: "Bitcoin", symbol: "BTC", family: "legacy", coinType: 0, p2pkh: "00", p2sh: ["05"], wif: "80", genesis: "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f", checkpoint: [478559, "00000000000000000019f112ec0a9982926f1258cdcc558dd7c3b7e5dc7fa148"], segwit: true, hrp: "bc", explorer: "https://mempool.space/tx/{txid}", servers: ["wss://electrum1.cipig.net:30000", "wss://electrum2.cipig.net:30000"], knownServers: ["electrum.vom-stausee.de s t", "electrum.hsmiths.com s t", "helicarrier.bauerj.eu s t", "electrum.hodlister.co s", "electrum3.hodlister.co s", "btc.usebsv.com s50006", "fortress.qtornado.com s443 t", "ecdsa.net s110 t", "e2.keff.org s t", "currentlane.lovebitco.in s t", "electrum.jochen-hoenicke.de s50005 t50003", "vps5.hsmiths.com s", "electrum.emzy.de s", "electrum1.cipig.net t10000 s20000", "ulrichard.ch s", "hodlers.beer s", "5.9.83.108 s", "v7gtzf7nua6hdmb2wtqaqioqmesdb4xrlly4zwr7bvayxv2bpg665pqd.onion t", "qeqgdlw2ezf3uabook2ny3lztjxxzeyyoqw2k7cempzvqpknbmevhmyd.onion t", "kciybn4d4vuqvobdl2kdp3r2rudqbqvsymqwg4jomzft6m6gaibaf6yd.onion t", "explorerzydxu5ecjrkwceayqybizmpjjznk5izmitf2modhcusuqlid.onion t110", "v7o2hkemnt677k3jxcbosmjjxw3p5khjyu7jwv7orfy6rwtkizbshwqd.onion t57001", "nf365b5sbzk5j4jreimskffwnfpka7qtamyni5doohoom3g63o5tldad.onion t"] },
  { id: "bca", name: "Bitcoin Atom", symbol: "BCA", family: "forkid", coinType: 185, p2pkh: "17", p2sh: ["0a"], wif: "80", genesis: "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f" },
  { id: "bch", name: "Bitcoin Cash", symbol: "BCH", family: "forkid", coinType: 145, p2pkh: "00", p2sh: ["05"], wif: "80", genesis: "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f", explorer: "https://blockchair.com/bitcoin-cash/transaction/{txid}", knownServers: ["bch.imaginary.cash s t", "electroncash.dk s t", "electrum.imaginary.cash s t", "bch.loping.net s t", "electroncash.de s t", "blackie.c3-soft.com s t"] },
  { id: "bcd", name: "Bitcoin Diamond", symbol: "BCD", family: "special", decimals: 7, coinType: 999, p2pkh: "00", p2sh: ["05"], wif: "80", genesis: "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f", segwit: true },
  { id: "btg", name: "Bitcoin Gold", symbol: "BTG", family: "forkid", coinType: 156, p2pkh: "26", p2sh: ["17"], wif: "80", genesis: "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f", segwit: true, knownServers: ["electrumx-eu.bitcoingold.org s50002 t50001", "electrumx-us.bitcoingold.org s50002 t50001"] },
  { id: "bitg", name: "BitcoinGreen", symbol: "BITG", family: "legacy", coinType: 222, p2pkh: "26", p2sh: ["06"], wif: "2e", genesis: "000008467c3a9c587533dea06ad9380cded3ed32f9742a6c0c1aebc21bf2bc9b" },
  { id: "xbc", name: "BitcoinPlus", symbol: "XBC", family: "txtime", coinType: 65, p2pkh: "19", p2sh: ["55"], wif: "99", genesis: "0000005f6a28e686f641c616e56182d1b43afbe08a223f23bda23cdf9d55b882" },
  { id: "btcp", name: "Bitcoin Private", symbol: "BTCP", family: "zcash", coinType: 183, p2pkh: "1325", p2sh: ["13af"], wif: "80", genesis: "0007104ccda289427919efc39dc9e4d499804b7bebc22df55f8b834301260602", headerTimeOffset: 100 },
  { id: "bsv", name: "Bitcoin SV", symbol: "BSV", family: "forkid", coinType: 236, p2pkh: "00", p2sh: ["05"], wif: "80", genesis: "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f", explorer: "https://blockchair.com/bitcoin-sv/transaction/{txid}", knownServers: ["electrumx.bitcoinsv.io s", "satoshi.vision.cash s", "sv.usebsv.com s t", "sv.jochen-hoenicke.de s t", "sv.satoshi.io s t"] },
  { id: "bzx", name: "BitcoinZero", symbol: "BZX", family: "legacy", coinType: 284, p2pkh: "4b", p2sh: ["22"], wif: "d2", genesis: "322bad477efb4b33fa4b1f0b2861eaf543c61068da9898a95062fdb02ada486f" },
  { id: "btx", name: "BitCore", symbol: "BTX", family: "legacy", coinType: 160, p2pkh: "03", p2sh: ["7d"], wif: "80", genesis: "604148281e5c4b7f2487e5d03cd60d8e6f69411d613f6448034508cea52e9574", segwit: true, hrp: "btx", knownServers: ["ele1.bitcore.cc s t", "ele2.bitcore.cc s t", "ele3.bitcore.cc s t", "ele4.bitcore.cc s t"] },
  { id: "bsd", name: "BitSend", symbol: "BSD", family: "legacy", coinType: 91, p2pkh: "66", p2sh: ["05"], wif: "cc", genesis: "0000012e1b8843ac9ce8c18603658eaf8895f99d3f5e7e1b7b1686f35e3c087a", segwit: true, knownServers: ["ele1.bitsend.cc s t", "51.15.121.233 s t"] },
  { id: "zny", name: "BitZeny", symbol: "ZNY", family: "legacy", coinType: 123, p2pkh: "51", p2sh: ["05"], wif: "80", genesis: "000009f7e55e9e3b4781e22bd87a7cfa4acada9e4340d43ca738bf4e9fb8f5ce", segwit: true },
  { id: "blk", name: "Blackcoin", symbol: "BLK", family: "txtime", coinType: 10, p2pkh: "19", p2sh: ["55"], wif: "99", genesis: "000001faef25dec4fbcf906e6242621df2c183bf232f263d0ba5b101911e4563", knownServers: ["electrum1.blackcoin.nl t10001 s10002", "electrum2.blackcoin.nl t20001 s20002", "electrum3.blackcoin.nl t30001 s30002"] },
  { id: "boli", name: "Bolivarcoin", symbol: "BOLI", family: "legacy", coinType: 278, p2pkh: "55", p2sh: ["05"], wif: "d5", genesis: "00000e4fc293a1912b9d73cbb8d8f7270007a7d84382f1370661e65d5d57b1f6" },
  { id: "cdn", name: "Canada eCoin", symbol: "CDN", family: "legacy", coinType: 34, p2pkh: "1c", p2sh: ["05"], wif: "9c", genesis: "863626dadaef221e2e2f30ff3dacae44cabdae9e0028058072181b3fb675d94a" },
  { id: "ccn", name: "Cannacoin", symbol: "CCN", family: "txtime-end", coinType: 19, p2pkh: "1c", p2sh: ["05"], wif: "bd", genesis: "f1b4cdf03c86099a0758f1c018d1a10bf05afab436c92b93b42bb88970de9821" },
  { id: "chips", name: "Chips", symbol: "CHIPS", family: "legacy", coinType: null, p2pkh: "3c", p2sh: ["55"], wif: "bc", genesis: "0000006e75f6aa0efdbf7db03132aa4e4d0c84951537a6f5a7c39a0a9d30e1e7", segwit: true },
  { id: "colx", name: "ColossusXT", symbol: "COLX", family: "legacy", coinType: 1999, p2pkh: "1e", p2sh: ["0d"], wif: "d4", genesis: "a0ce8206c908357008c1b9a8ba2813aff0989ca7f72d62b14e652c55f02b4f5c", knownServers: ["electrum.polispay.com"] },
  { id: "crw", name: "Crown", symbol: "CRW", family: "legacy", coinType: 72, p2pkh: "017507", p2sh: ["0174f1"], wif: "80", genesis: "0000000085370d5e122f64f4ab19c68614ff3df78c8d13cb814fd7e69a1dc6da", knownServers: ["sgp-crwseed.crowndns.info s t", "blr-crwseed.crowndns.info s t", "sfo-crwseed.crowndns.info s t", "nyc-crwseed.crowndns.info s t", "ams-crwseed.crowndns.info s t", "tor-crwseed.crowndns.info s t", "lon-crwseed.crowndns.info s t", "fra-crwseed.crowndns.info s t"] },
  { id: "dash", name: "Dash", symbol: "DASH", family: "legacy", coinType: 5, p2pkh: "4c", p2sh: ["10"], wif: "cc", genesis: "00000ffd590b1485b3caadc19b22e6379c733355108f107a430458cdf3407ab6", explorer: "https://blockchair.com/dash/transaction/{txid}", knownServers: ["electrum.dash.org s t", "electrum.masternode.io s t", "electrum-drk.club s t", "dashcrypto.space s t", "electrum.dash.siampm.com s t"], dust: "5460" },
  { id: "dcr", name: "Decred", symbol: "DCR", family: "special", coinType: 42, p2pkh: "073f", p2sh: ["071a"], wif: "22de", genesis: "298e5cc3d985bfe7f81dc135f360abe089edd4396b86d2de66b0cef42b21d980" },
  { id: "onion", name: "DeepOnion", symbol: "ONION", family: "txtime", coinType: 305, p2pkh: "1f", p2sh: ["4e"], wif: "9f", genesis: "000004e29458ef4f2e0abab544737b07344e6ff13718f7c2d12926166db07b5e" },
  { id: "defc", name: "Defcoin", symbol: "DEFC", family: "legacy", coinType: 1337, p2pkh: "1e", p2sh: ["05"], wif: "9e", genesis: "192047379f33ffd2bbbab3d53b9c4b9e9b72e48f888eadb3dcf57de95a6038ad", segwit: true },
  { id: "d", name: "Denarius", symbol: "D", family: "txtime", coinType: 116, p2pkh: "1e", p2sh: ["5a"], wif: "9e", genesis: "00000d5dbbda01621cfc16bbc1f9bf3264d641a5dbf0de89fd0182c2c4828fcd" },
  { id: "dgb", name: "DigiByte", symbol: "DGB", family: "legacy", coinType: 20, p2pkh: "1e", p2sh: ["3f", "05"], wif: "80", genesis: "7497ea1b465eb39f1c8f507bc877078fe016d6fcb6dfad3a64c98dcc6e1e8496", segwit: true, hrp: "dgb" },
  { id: "dgc", name: "Digitalcoin", symbol: "DGC", family: "legacy", coinType: 18, p2pkh: "1e", p2sh: ["05"], wif: "9e", genesis: "5e039e1ca1dbf128973bf6cff98169e40a1b194c3b91463ab74956f413b2f9c8" },
  { id: "doge", name: "Dogecoin", symbol: "DOGE", family: "legacy", coinType: 3, p2pkh: "1e", p2sh: ["16"], wif: "9e", genesis: "1a91e3dace36e2be3bf030a65679fe821aa1d6ef92e7c9902eb318182c355691", segwit: true, explorer: "https://dogechain.info/tx/{txid}", dust: "1000000", minFeeKb: 1000000, maxFee: "500000000", knownServers: ["electrum1.cipig.net t10060 s20060", "electrum2.cipig.net t10060 s20060"], servers: ["wss://electrum1.cipig.net:30060", "wss://electrum2.cipig.net:30060"] },
  { id: "donu", name: "Donu", symbol: "DONU", family: "legacy", coinType: 405, p2pkh: "35", p2sh: ["05"], wif: "b1", genesis: "5f7f26e24291f5be2351e1dcdab18bf94cee718940e6b9f2fbb46227434c3f12", segwit: true },
  { id: "ecc", name: "ECCoin", symbol: "ECC", family: "txtime", decimals: 6, coinType: 319, p2pkh: "21", p2sh: ["08"], wif: "80", genesis: "a60ac43c88dbc44b826cf315352a8a7b373d2af8b6e1c4c4a0638859c5e9ecd1" },
  { id: "efl", name: "e-Gulden", symbol: "EFL", family: "legacy", coinType: 78, p2pkh: "30", p2sh: ["05"], wif: "b0", genesis: "6d39f28ad01a7edd3e2374b355cf8c7f8dbc1c5e4596ad3642fa6d10c2599217" },
  { id: "emc2", name: "Einsteinium", symbol: "EMC2", family: "legacy", coinType: 41, p2pkh: "21", p2sh: ["05"], wif: "b0", genesis: "4e56204bb7b8ac06f860ff1c845f03f984303b5b97eb7b42868f714611aed94b", segwit: true },
  { id: "eca", name: "Electra", symbol: "ECA", family: "txtime", coinType: 249, p2pkh: "21", p2sh: ["28"], wif: "a1", genesis: "00000f98da995de0ef1665c7d3338687923c1199230a44ecbdb5cec9306e4f4e" },
  { id: "xep", name: "Electra Protocol", symbol: "XEP", family: "legacy", coinType: 597, p2pkh: "37", p2sh: ["05"], wif: "a2", genesis: "000000954c02f260a6db02c712557adcb5a7a8a0a9acfd3d3c2b3a427376c56f", segwit: true, knownServers: ["electrumx1.electraprotocol.eu s t", "electrumx2.electraprotocol.eu s t", "electrumx3.electraprotocol.eu s t", "electrumx4.electraprotocol.eu s t", "electrumx5.electraprotocol.eu s t"] },
  { id: "emc", name: "Emercoin", symbol: "EMC", family: "txtime", decimals: 6, coinType: null, p2pkh: "21", p2sh: ["5c"], wif: "80", genesis: "00000000bcccd459d036a588d1008fce8da3754b205736f32ddfd35350e84c2d" },
  { id: "erc", name: "EuropeCoin", symbol: "ERC", family: "legacy", coinType: 151, p2pkh: "21", p2sh: ["05"], wif: "a8", genesis: "000d0da26987ead011c5d568e627f7e3d4a4f83a0b280b1134d8e7e366377f9a" },
  { id: "exos", name: "EXOS", symbol: "EXOS", family: "txtime", coinType: 248, p2pkh: "1c", p2sh: ["05"], wif: "9c", genesis: "00000036090a68c523471da7a4f0f958c1b4403fef74a003be7f71877699cab7" },
  { id: "fair", name: "FairCoin", symbol: "FAIR", family: "legacy", coinType: 298, p2pkh: "5f", p2sh: ["24"], wif: "df", genesis: "beed44fa5e96150d95d56ebd5d2625781825a9407a5215dd7eda723373a0a1d7", knownServers: ["electrum.faircoin.world s", "electrumfair.punto0.org s"] },
  { id: "ftc", name: "Feathercoin", symbol: "FTC", family: "legacy", coinType: 8, p2pkh: "0e", p2sh: ["05"], wif: "8e", genesis: "12a765e31ffd4059bada1e25190f6e98c99d9714d334efa41a195a7e7e04bfe2", segwit: true, hrp: "fc", knownServers: ["electrumx-gb-1.feathercoin.network s t", "electrumx-gb-2.feathercoin.network s t", "electrumx-de-1.feathercoin.network s t"], dust: "54600" },
  { id: "fec", name: "Ferrite", symbol: "FEC", family: "legacy", coinType: null, p2pkh: "24", p2sh: ["23", "05"], wif: "a3", genesis: "46ca17415c18e43f5292034ebf9bbd10de80a61fc6dc17180e6609f33d3b48f3", segwit: true, knownServers: ["enode1.ferritecoin.org s t", "enode2.ferritecoin.org s t", "enode3.ferritecoin.org s t"] },
  { id: "flash", name: "Flashcoin", symbol: "FLASH", family: "legacy", coinType: 120, p2pkh: "44", p2sh: ["82"], wif: "c4", genesis: "aa0cf4f5ce0a3c550ce5674c1e808c417cf5077b4e95bda1d6fbaeaf4258972b" },
  { id: "fjc", name: "FujiCoin", symbol: "FJC", family: "legacy", coinType: 75, p2pkh: "24", p2sh: ["10"], wif: "a4", genesis: "adb6d9cfd74075e7f91608add4bd2a2ea636f70856183086842667a1597714a0", segwit: true, hrp: "fc", minFeeKb: 10000000 },
  { id: "game", name: "GameCredits", symbol: "GAME", family: "legacy", coinType: 101, p2pkh: "26", p2sh: ["05"], wif: "a6", genesis: "91ec5f25ee9a0ffa1af7d4da4db9a552228dd2dc77cdb15b738be4e1f55f30ee", segwit: true },
  { id: "grlc", name: "Garlicoin", symbol: "GRLC", family: "legacy", coinType: 69420, p2pkh: "26", p2sh: ["32", "05"], wif: "b0", genesis: "2ada80bf415a89358d697569c96eb98cdbf4c3b8878ac5722c01284492e27228", segwit: true, knownServers: ["us.node.garlico.in s", "ca.node.garlico.in s t", "sg.node.garlico.in s", "de.node.garlico.in s", "fr.garlium.crapules.org s", "uk.garlium.crapules.org s", "pl.garlium.crapules.org s", "ca.garlium.crapules.org s", "au.garlium.crapules.org s", "electrum.hotgrlc.com s t", "electrum.maxpuig.com s t"] },
  { id: "gxx", name: "GravityCoin", symbol: "GXX", family: "legacy", coinType: 285, p2pkh: "28", p2sh: ["0a"], wif: "d2", genesis: "322bad477efb4b33fa4b1f0b2861eaf543c61068da9898a95062fdb02ada486f" },
  { id: "gzro", name: "GravityZeroCoin", symbol: "GZRO", family: "txtime", coinType: null, p2pkh: "26", p2sh: ["05"], wif: "26", genesis: "0000028bfbf9ccaed8f28b3ca6b3ffe6b65e29490ab0e4430679bf41cc7c164f" },
  { id: "grs", name: "Groestlcoin", symbol: "GRS", family: "special", coinType: 17, p2pkh: "24", p2sh: ["05"], wif: "80", genesis: "00000ac5927c594d49cc0bdb81759d0da8297eb614683d3acb62f0703b639023", hrp: "grs", explorer: "https://blockchair.com/groestlcoin/transaction/{txid}", knownServers: ["electrum1.groestlcoin.org s t", "electrum2.groestlcoin.org s t", "glzyzqiulwclsowniyjeg5tspdojfgiiizbpnepcxoswqkmsjzlkucqd.onion t", "jcv7kwu3gopzxp3r2ve43m6nahrxzc426hif4o3a2vt7wl4xq6tg3xqd.onion t"] },
  { id: "hodl", name: "HODLcoin", symbol: "HODL", family: "legacy", coinType: 1989, p2pkh: "28", p2sh: ["05"], wif: "a8", genesis: "008872e5582924544e5c707ee4b839bb82c28a9e94e917c94b40538d5658c04b", segwit: true },
  { id: "hush", name: "Hush", symbol: "HUSH", family: "zcash", coinType: 197, p2pkh: "3c", p2sh: ["55"], wif: "bc", genesis: "027e3758c3a65b12aa1046462b486d0a63bfa1beae327897f56c5cfb7daaae71", headerTimeOffset: 100 },
  { id: "iop", name: "Internet of People", symbol: "IOP", family: "legacy", coinType: 66, p2pkh: "75", p2sh: ["ae"], wif: "31", genesis: "00000000bf5f2ee556cb9be8be64e0776af14933438dbb1af72c41bfb6c82db3", segwit: true },
  { id: "ixc", name: "Ixcoin", symbol: "IXC", family: "legacy", coinType: 86, p2pkh: "8a", p2sh: ["05"], wif: "80", genesis: "0000000001534ef8893b025b9c1da67250285e35c9f76cae36a4904fdf72c591" },
  { id: "kmd", name: "Komodo", symbol: "KMD", family: "zcash", coinType: 141, p2pkh: "3c", p2sh: ["55"], wif: "bc", genesis: "027e3758c3a65b12aa1046462b486d0a63bfa1beae327897f56c5cfb7daaae71", headerTimeOffset: 100 },
  { id: "koto", name: "Koto", symbol: "KOTO", family: "zcash", coinType: 510, p2pkh: "1836", p2sh: ["183b"], wif: "80", genesis: "6d424c350729ae633275d51dc3496e16cd1b1d195c164da00f39c499a2e9959e", headerTimeOffset: 100, knownServers: ["fr.kotocoin.info s t", "electrum.kotocoin.info s t"] },
  { id: "lbc", name: "LBRY Credits", symbol: "LBC", family: "legacy", coinType: 140, p2pkh: "55", p2sh: ["7a"], wif: "1c", genesis: "9c89283ba0f3227f6c03b70216b9f665f0118d5e0fa729cedf4fb34d6a34f463", headerTimeOffset: 100, segwit: true },
  { id: "linx", name: "Linx", symbol: "LINX", family: "legacy", coinType: 114, p2pkh: "4b", p2sh: ["05"], wif: "cb", genesis: "3bafea350a70f75e7a1cd279999faed71a51852aae88fed3c38553cecc810a92" },
  { id: "ltc", name: "Litecoin", symbol: "LTC", family: "legacy", coinType: 2, p2pkh: "30", p2sh: ["32", "05"], wif: "b0", genesis: "12a765e31ffd4059bada1e25190f6e98c99d9714d334efa41a195a7e7e04bfe2", hrp: "ltc", explorer: "https://litecoinspace.org/tx/{txid}", knownServers: ["ex.lug.gs s444", "electrum-ltc.bysh.me s t", "electrum-ltc.ddns.net s t", "electrum-ltc.wilv.in s t", "electrum.cryptomachine.com s t", "electrum.ltc.xurious.com s t", "electrum1.cipig.net t10063 s20063", "electrum2.cipig.net t10063 s20063"], servers: ["wss://electrum1.cipig.net:30063", "wss://electrum2.cipig.net:30063"] },
  { id: "lcc", name: "Litecoin Cash", symbol: "LCC", family: "legacy", coinType: 192, p2pkh: "1c", p2sh: ["32", "05"], wif: "b0", genesis: "12a765e31ffd4059bada1e25190f6e98c99d9714d334efa41a195a7e7e04bfe2", segwit: true },
  { id: "lynx", name: "Lynx", symbol: "LYNX", family: "legacy", coinType: 191, p2pkh: "2d", p2sh: ["16"], wif: "ad", genesis: "984b30fc9bb5e5ff424ad7f4ec1930538a7b14a2d93e58ad7976c23154ea4a76", segwit: true },
  { id: "mac", name: "Machinecoin", symbol: "MAC", family: "legacy", coinType: null, p2pkh: "32", p2sh: ["26", "05"], wif: "b2", genesis: "6a1f879bcea5471cbfdee1fd0cb2ddcc4fed569a500e352d41de967703e83172", segwit: true },
  { id: "mnx", name: "Minexcoin", symbol: "MNX", family: "legacy", coinType: 182, p2pkh: "4b", p2sh: ["05"], wif: "80", genesis: "490a36d9451a55ed197e34aca7414b35d775baa4a8e896f1c577f65ce2d214cb", headerTimeOffset: 100, knownServers: ["electrumx.xpresit.net s t", "elex01-ams.turinex.eu s t", "eu.minexpool.nl s t"] },
  { id: "mnp", name: "MNPCoin", symbol: "MNP", family: "legacy", coinType: 2001, p2pkh: "32", p2sh: ["35"], wif: "37", genesis: "00000924036c67d803ce606ded8143127e62fa2111dd3b063880a1067c69ccb1", knownServers: ["electrum.polispay.com"] },
  { id: "mona", name: "Monacoin", symbol: "MONA", family: "legacy", coinType: 22, p2pkh: "32", p2sh: ["37", "05"], wif: "b0", genesis: "ff9f1c0116d19de7c9963845e129f9ed1bfc0b376eb54fd7afa42e0d418c8bb6", segwit: true, hrp: "mona", knownServers: ["electrumx.tamami-foundation.org s t", "electrumx3.monacoin.nl s t", "electrumx1.monacoin.ninja s t", "electrumx2.movsign.info s t", "electrum-mona.bitbank.cc s t"], dust: "54600", minFeeKb: 100000 },
  { id: "mnz", name: "Monaize", symbol: "MNZ", family: "zcash", coinType: null, p2pkh: "3c", p2sh: ["55"], wif: "bc", genesis: "027e3758c3a65b12aa1046462b486d0a63bfa1beae327897f56c5cfb7daaae71", headerTimeOffset: 100 },
  { id: "yce", name: "Myce", symbol: "YCE", family: "txtime", coinType: 449, p2pkh: "32", p2sh: ["05"], wif: "99", genesis: "0000c74cc66c72cb1a327c5c1d4893ae5276aa50be49fb23cec21df1a2f20d87" },
  { id: "xmy", name: "Myriadcoin", symbol: "XMY", family: "legacy", coinType: 90, p2pkh: "32", p2sh: ["09"], wif: "b2", genesis: "00000ffde4c020b5938441a0ea3d314bf619eff0b38f32f78f7583cffa1ea485", segwit: true },
  { id: "nmc", name: "Namecoin", symbol: "NMC", family: "legacy", coinType: 7, p2pkh: "34", p2sh: ["0d"], wif: "e4", genesis: "000000000062b72c5e2ceb45fbc8587e807c155b0da735e6483dfba2f0a9c770", segwit: true, hrp: "nc", knownServers: ["198.50.223.25 s50002", "46.229.238.187 s57002", "198.50.223.27 s50002", "electrum-nmc.le-space.de s50002", "electrumx2.nmc.dotbit.zone s50002", "electrumx4.nmc.dotbit.zone s50002", "nmc.bitcoins.sk s50002", "nmc2.bitcoins.sk s57002", "ulrichard.ch s50006 t50005", "h6qrnwxtwiaahsw4qhk2nbutswwb54vnqso6jrxeuk6nwtfbos7jkoqd.onion s50002", "mqhok2edqcxdpklwovquuvvl2q5or4g2o777qwrinydgzfxjbixq76yd.onion s50002", "wirg2tsto7rme7n26lkd3ivbvxmjyy2pktlozwjuep22jcsfsghfqbqd.onion s50002", "quuzpffsddq3aim3gk4oiczzyt5okjjzf4zpe6okzo6qidao6rshynqd.onion s50002"], dust: "2940", minFeeKb: 100000 },
  { id: "nav", name: "Navcoin", symbol: "NAV", family: "special", coinType: 130, p2pkh: "35", p2sh: ["55"], wif: "96", genesis: "00006a4e3e18c71c6d48ad6c261e2254fa764cf29607a4357c99b712dfbb8e6a", segwit: true },
  { id: "nebl", name: "Neblio", symbol: "NEBL", family: "txtime", coinType: 146, p2pkh: "35", p2sh: ["70"], wif: "80", genesis: "7286972be4dbc1463d256049b7471c252e6557e222cab9be73181d359cd28bcc" },
  { id: "nyc", name: "NewYorkCoin", symbol: "NYC", family: "legacy", coinType: 179, p2pkh: "3c", p2sh: ["16"], wif: "bc", genesis: "5597f25c062a3038c7fd815fe46c67dedfcb3c839fbc8e01ed4044540d08fe48" },
  { id: "nix", name: "NIX", symbol: "NIX", family: "legacy", coinType: 400, p2pkh: "26", p2sh: ["35"], wif: "80", genesis: "dd28ad86def767c3cfc34267a950d871fc7462bc57ea4a929fc3596d9b598e41", segwit: true },
  { id: "nor", name: "Noir", symbol: "NOR", family: "legacy", coinType: 610, p2pkh: "00", p2sh: ["07"], wif: "d0", genesis: "23911212a525e3d149fcad6c559c8b17f1e8326a272a75ff9bb315c8d96433ef" },
  { id: "odin", name: "ODIN", symbol: "ODIN", family: "legacy", coinType: null, p2pkh: "73", p2sh: ["39"], wif: "8a", genesis: "31ca29566549e444cf227a0e2e067aed847c2acc541d3bbf9ca1ae89f4fd57d7", segwit: true },
  { id: "onx", name: "Onixcoin", symbol: "ONX", family: "legacy", coinType: 174, p2pkh: "4b", p2sh: ["05"], wif: "80", genesis: "000007140b7a6ca0b64965824f5731f6e86daadf19eb299033530b1e61236e43" },
  { id: "pac", name: "PACcoin", symbol: "PAC", family: "legacy", coinType: 8192, p2pkh: "37", p2sh: ["0a"], wif: "cc", genesis: "00000354655ff039a51273fe61d3b493bd2897fe6c16f732dbc4ae19f04b789e", knownServers: ["electrum.paccoin.io s t", "electro-pac.paccoin.io s t"] },
  { id: "ppc", name: "Peercoin", symbol: "PPC", family: "txtime", decimals: 6, coinType: 6, p2pkh: "37", p2sh: ["75"], wif: "b7", genesis: "0000000032fe677166d54963b62a4677d8957e87c508eaa4fd7eb1c880cd27e3", segwit: true, knownServers: ["electrum.peercoinexplorer.net s"] },
  { id: "pivx", name: "PIVX", symbol: "PIVX", family: "special", coinType: 119, p2pkh: "1e", p2sh: ["05"], wif: "d4", genesis: "0000041e482b9b9691d98eefb48473405c0b8ec31b76df3797c74a78680ef818" },
  { id: "polis", name: "Polis", symbol: "POLIS", family: "legacy", coinType: 1997, p2pkh: "37", p2sh: ["38"], wif: "3c", genesis: "000009701eb781a8113b1af1d814e2f060f6408a2c990db291bc5108a1345c1e", knownServers: ["electrum.polispay.com"] },
  { id: "xpm", name: "Primecoin", symbol: "XPM", family: "legacy", coinType: 24, p2pkh: "17", p2sh: ["53"], wif: "97", genesis: "963d17ba4dc753138078a2f56afb3af9674e2546822badff26837db9a0152106", knownServers: ["electrumx.primecoin.org s t"] },
  { id: "qbc", name: "Quebecoin", symbol: "QBC", family: "legacy", coinType: 387, p2pkh: "3a", p2sh: ["05"], wif: "ba", genesis: "000008c2d57759af6462352ee9f4923d97401cb599a9318e6595a2a74c26ea74", segwit: true },
  { id: "rvn", name: "Ravencoin", symbol: "RVN", family: "legacy", coinType: 175, p2pkh: "3c", p2sh: ["7a"], wif: "80", genesis: "0000006b444bc2f2ffe627be9d9e7e7a0730000870ef6eb6da46c8eae389df90", segwit: true, knownServers: ["electrumx.raventag.com s", "electrum1.cipig.net t10051 s20051", "electrum2.cipig.net t10051 s20051"], servers: ["wss://electrum1.cipig.net:30051", "wss://electrum2.cipig.net:30051"] },
  { id: "rdd", name: "ReddCoin", symbol: "RDD", family: "txtime-end", coinType: 4, p2pkh: "3d", p2sh: ["05"], wif: "bd", genesis: "b868e0d95a3c3c0e0dadc67ee587aaf9dc8acbf99e3b4b3110fad4eb74c1decc" },
  { id: "sib", name: "Sibcoin", symbol: "SIB", family: "legacy", coinType: null, p2pkh: "3f", p2sh: ["28"], wif: "80", genesis: "00000c492bf73490420868bc577680bfc4c60116e7e85343bc624787c21efa4c" },
  { id: "spl", name: "Simplicity", symbol: "SPL", family: "txtime", coinType: 448, p2pkh: "12", p2sh: ["05"], wif: "5d", genesis: "f4bbfc518aa3622dbeb8d2818a606b82c2b8b1ac2f28553ebdb6fc04d7abaccf" },
  { id: "smart", name: "SmartCash", symbol: "SMART", family: "special", coinType: 224, p2pkh: "3f", p2sh: ["12"], wif: "bf", genesis: "000007acc6970b812948d14ea5a0a13db0fdd07d5047c7e69101fa8b361e05a4" },
  { id: "smly", name: "Smileycoin", symbol: "SMLY", family: "legacy", coinType: 59, p2pkh: "19", p2sh: ["05"], wif: "b0", genesis: "660f734cf6c6d16111bde201bbd2122873f2f2c078b969779b9d4c99732354fd" },
  { id: "xsg", name: "SnowGem", symbol: "XSG", family: "zcash", coinType: null, p2pkh: "1c28", p2sh: ["1c2d"], wif: "80", genesis: "00068b35729d9d2b0c294ff1fe9af0094740524311a131de40e7f705e4c29a5b", headerTimeOffset: 100 },
  { id: "sum", name: "Sumcoin", symbol: "SUM", family: "legacy", coinType: 552, p2pkh: "3f", p2sh: ["c8", "05"], wif: "bf", genesis: "37d4696c5072cd012f3b7c651e5ce56a1383577e4edacc2d289ec9b25eebfd5e", segwit: true },
  { id: "sys", name: "Syscoin", symbol: "SYS", family: "legacy", coinType: 57, p2pkh: "3f", p2sh: ["05"], wif: "80", genesis: "0000022642db0346b6e01c2a397471f4f12e65d4f4251ec96c1f85367a61a7ab", segwit: true, hrp: "sys", dust: "1820", minFeeKb: 10000 },
  { id: "tpay", name: "TokenPay", symbol: "TPAY", family: "special", coinType: 265, p2pkh: "41", p2sh: ["7e"], wif: "b3", genesis: "000008b71ab32e585a23f0de642dc113740144e94c0ece047751e9781f953ae9", knownServers: ["electrum-us.tpay.ai s", "electrum-eu.tpay.ai s"] },
  { id: "tzc", name: "Trezarcoin", symbol: "TZC", family: "txtime", decimals: 6, coinType: 232, p2pkh: "42", p2sh: ["08"], wif: "c2", genesis: "24502ba55d673d2ee9170d83dae2d1adb3bfb4718e4f200db9951382cc4f6ee6", knownServers: ["electrumx1.trezarcoin.com s t"] },
  { id: "ufo", name: "Uniform Fiscal Object", symbol: "UFO", family: "legacy", coinType: 202, p2pkh: "1b", p2sh: ["44"], wif: "9b", genesis: "ba1d39b4928ab03d813d952daf65fb7797fcf538a9c1b8274f4edc8557722d13", segwit: true, knownServers: ["electrumx1.ufobject.com s t"] },
  { id: "uis", name: "Unitus", symbol: "UIS", family: "legacy", coinType: null, p2pkh: "44", p2sh: ["0a"], wif: "84", genesis: "d8a2b2439d013a59f3bfc626a33487a3d7d27e42a3c9e0b81af814cd8e592f31", segwit: true, knownServers: ["electrumx.unituscurrency.com s t"] },
  { id: "uno", name: "Unobtanium", symbol: "UNO", family: "legacy", coinType: 92, p2pkh: "82", p2sh: ["1e"], wif: "e0", genesis: "000004c2fc5fffb810dccc197d603690099a68305232e552d96ccbe8e2c52b75" },
  { id: "xvg", name: "Verge", symbol: "XVG", family: "txtime", coinType: 77, p2pkh: "30", p2sh: ["33"], wif: "9e", genesis: "00000fc63692467faeb20cdb3b53200dc601d75bdfa1001463304cc790d77278" },
  { id: "vtc", name: "Vertcoin", symbol: "VTC", family: "legacy", coinType: 28, p2pkh: "47", p2sh: ["05"], wif: "80", genesis: "4d96a915f49d40b1e5c2844d1ee2dccb90013a990ccea12c492d22110489f0c4", segwit: true, hrp: "vtc", knownServers: ["electrumx-vtc.cryptoverted.com t55001 s55002", "electrumx.javerity.com t5885 s5886"], dust: "54600", minFeeKb: 100000 },
  { id: "via", name: "Viacoin", symbol: "VIA", family: "legacy", coinType: 14, p2pkh: "47", p2sh: ["21"], wif: "c7", genesis: "4e9b54001f9976049830128ec0331515eaabe35a70970d79971da1539a400ba1", segwit: true, hrp: "via", knownServers: ["vialectrum.bitops.me s t", "server.vialectrum.org s t", "vialectrum.viacoin.net s t", "viax1.bitops.me s t"], dust: "54600" },
  { id: "chi", name: "Xaya", symbol: "CHI", family: "legacy", coinType: 509, p2pkh: "1c", p2sh: ["1e"], wif: "82", genesis: "e5062d76e5f50c42f493826ac9920b63a8def2626fd70a5cec707ec47a4c4651", knownServers: ["seeder.xaya.io s50002", "xaya.domob.eu s50002"] },
  { id: "xuez", name: "Xuez", symbol: "XUEZ", family: "legacy", coinType: 225, p2pkh: "48", p2sh: ["12"], wif: "d4", genesis: "000000e1febc39965b055e8e0117179a4d18e24e7aaa0c69864c4054b4f29445" },
  { id: "zec", name: "Zcash", symbol: "ZEC", family: "zcash", coinType: 133, p2pkh: "1cb8", p2sh: ["1cbd"], wif: "80", genesis: "00040fe8ec8471911baa1db1266ea15dd06b4a8a5c453883c000b031973dce08", headerTimeOffset: 100, explorer: "https://blockchair.com/zcash/transaction/{txid}" },
  { id: "zcl", name: "Zclassic", symbol: "ZCL", family: "zcash", coinType: 147, p2pkh: "1cb8", p2sh: ["1cbd"], wif: "80", genesis: "0007104ccda289427919efc39dc9e4d499804b7bebc22df55f8b834301260602", headerTimeOffset: 100 },
  { id: "xzc", name: "Zcoin", symbol: "XZC", family: "legacy", coinType: 136, p2pkh: "52", p2sh: ["07"], wif: "d2", genesis: "4381deb85b1b2c9843c222944b616d997516dcbd6a964e1eaf0def0830695233", knownServers: ["electrum.polispay.com"] },
  { id: "zel", name: "ZelCash", symbol: "ZEL", family: "zcash", coinType: 19167, p2pkh: "1cb8", p2sh: ["1cbd"], wif: "80", genesis: "00052461a5006c2e3b74ce48992a08695607912d5604c3eb8da25749b0900444", headerTimeOffset: 100 },
  { id: "zer", name: "Zero", symbol: "ZER", family: "zcash", coinType: 323, p2pkh: "1cb8", p2sh: ["1cbd"], wif: "80", genesis: "068cbb5db6bc11be5b93479ea4df41fa7e012e92ca8603c315f9b1a2202205c6", headerTimeOffset: 100 }
]
