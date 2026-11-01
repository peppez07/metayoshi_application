# Multi-coin plan

Goal: add the 116 coins from the request to MetaYoshi the way BitcoinZ was
added: one recovery phrase, one address per coin, keys and signing in the
browser, ElectrumX servers for chain data.

## Research sources

- ElectrumX `coins.py` (spesmilo 1.20.0 for genesis hashes, address bytes,
  transaction formats and known servers; 1.18.0 for WIF bytes, which later
  releases dropped). 112 of the 116 coins are defined there.
- SLIP-0044 for the BIP44 coin type of each coin.
- Each coin's own `chainparams.cpp` where a family needs more (branch IDs,
  fork IDs, transaction versions), as done for BitcoinZ.

## What decides the work: transaction families

Keys and P2PKH addresses work the same for every coin (secp256k1, Base58Check,
different version bytes). What differs is how transactions are serialized and
signed. The coins fall into these families:

| Family | Coins | Work |
|---|---|---|
| A legacy | 72 (BTC, LTC, DOGE, DASH, DGB, RVN, NMC, VTC, MONA, SYS …) | Bitcoin legacy sighash, P2PKH. Mostly data. Parser must skip SegWit, MWEB (LTC) and Dash special-transaction data. |
| B forkid | BCH, BSV, BTG, BCA | BIP143 digest with SIGHASH_FORKID and a per-coin fork ID; CashAddr for BCH. |
| C zcash | ZEC, KMD, HUSH, ZCL, ZER, FLUX, KOTO, XSG, BTCP, MNZ, BTCZ | Reuse the BitcoinZ code with per-coin branch IDs and versions; ZEC needs NU5/NU6 branch IDs and ZIP-317 fees; KMD has interest and locktime rules. |
| D txtime | 18 PoS coins (PPC, BLK, NEBL, RDD, XVG, BAY, …) | Transaction carries a timestamp (after the version, or at the end for Reddcoin-style). |
| E special | GRS, DCR, NAV, PIVX, SMART, BCD, TPAY | Own hashing or formats (Groestl checksums, Decred's BLAKE-256 format, PIVX Sapling, SmartCash Keccak …). |
| research | CIVX, GBX, XMCC, XMN | Not in ElectrumX; need their chainparams. |

## The real limit: servers

A browser extension can only reach servers over secure WebSocket or HTTPS with
a browser-trusted certificate. Public ElectrumX servers almost all offer only
TCP/SSL, usually with self-signed certificates. ElectrumX lists known servers
for only about 35 of these coins, and those lists are from 2018–2021; for the
rest there is no known public server at all. Several coins are probably
abandoned (for example Bitcoin Atom, Bitcoin Private, Minexcoin, Monaize, NIX,
Noir, TokenPay).

So a coin being "supported" in the wallet does not mean it works out of the
box. The plan:

1. The wallet supports a coin when its family is implemented and tested. Each
   coin can be enabled from a searchable list, like MetaMask networks.
2. Default servers are only set where a browser-reachable endpoint is known.
   Otherwise the coin shows "No server configured" and lets you add one.
3. Recommended infrastructure: extend the HTTPS gateway (already used for
   RTM, `/api/v1/electrum`) to `/api/v1/electrum/<coin>`, proxying to
   TCP/SSL ElectrumX servers server-side. One gateway then serves every coin
   to the browser. That work belongs in the gateway repository.

## Decisions needed

- Coins without a registered SLIP-44 coin type (CHIPS, FEC, MAC, ODIN, SIB,
  UIS, and later EMC, GZRO, MNZ, XSG): which derivation path to use. Any
  choice is MetaYoshi-specific and other wallets would not find the funds
  from the recovery phrase, so these stay off until a path is chosen.

## Phases

| Phase | Content | Status |
|---|---|---|
| 0 | Research table (below), this plan | done |
| 1 | Coin registry; per-coin servers, addresses and settings; coin picker with search; family A signing and parser; per-coin dust and fee limits; paying bech32 addresses | done: 66 family A coins |
| 2 | Family C (Zcash variants) | planned |
| 3 | Family B (fork ID, CashAddr) | planned |
| 4 | Family D (timestamped PoS transactions) | planned |
| 5 | Family E coins one by one | planned |
| 6 | Native SegWit (bech32) receive addresses for SegWit coins | planned |
| 7 | Four coins missing from ElectrumX | planned |

Each phase ships with tests: address encoding, signatures checked against the
coin's sighash rules (official test vectors where they exist), and the full
send flow against a mock ElectrumX server, as for BitcoinZ.

## Verification of phase 1

Done for every one of the 66 Bitcoin-style coins (`src/store/allCoins.test.ts`):
enable the coin, connect to a mock ElectrumX server reporting that coin's
genesis hash, read balance and history (plain and SegWit funding
transactions), build and sign a send to the account's second address, check
the signature against the legacy digest, broadcast.

Cross-checked against sources independent of ElectrumX:

- Published BIP44 addresses of the test phrase for BTC, LTC, DOGE and DASH.
- Trezor firmware `common/defs/bitcoin` (18 of the 66 coins) and the
  `coininfo` package: address bytes, coin types, genesis hashes, bech32
  prefixes. Fixed from this: Crown now uses its current 3-byte prefixes
  (`CRW…` addresses; ElectrumX still had the pre-2019 ones), DigiByte's
  current P2SH byte `0x3f`, FujiCoin's bech32 prefix `fc`. Namecoin's P2SH
  byte stays `0x0d` (Namecoin Core) where Trezor lists `0x05`.
- Trezor's dust limits and minimum fee rates are used as floors (MONA, VIA,
  VTC, FTC, NMC, DASH, AXE, SYS dust; MONA, DOGE, VTC, NMC, FJC, SYS fees).

Not possible from the development environment: real servers and block
explorers are blocked there, so no coin has been tried on its live network.
Before relying on a coin, receive and send a small amount.

## Coins

Family letter as above; "P2PKH" is the address version byte(s); "Coin type"
is the SLIP-44 number used in `m/44'/<type>'/<account>'/0/0` (— = none
registered); "Known servers" is the number of servers ElectrumX lists.

| Coin | Ticker | Family | P2PKH | Coin type | Known servers |
|---|---|---|---|---|---|
| Adcoin | ACC | A legacy | 1e | 161 | 0 |
| Argentum | ARG | A legacy | 17 | 45 | 0 |
| Aryacoin | AYA | A legacy | 17 | 357 | 0 |
| Auroracoin | AUR | A legacy | 17 | 85 | 0 |
| AXE | AXE | A legacy | 37 | 4242 | 0 |
| Bata | BTA | A legacy | 19 | 89 | 0 |
| Beyondcoin | BYND | A legacy | 19 | 536 | 0 |
| BitBay | BAY | D txtime | 19 | 2125 | 0 |
| Bitcoin | BTC | A legacy | 00 | 0 | 23 |
| Bitcoin Atom | BCA | B forkid | 17 | 185 | 0 |
| Bitcoin Cash | BCH | B forkid | 00 | 145 | 6 |
| Bitcoin Diamond | BCD | E special | 00 | 999 | 0 |
| Bitcoin Gold | BTG | B forkid | 26 | 156 | 2 |
| BitcoinGreen | BITG | A legacy | 26 | 222 | 0 |
| BitcoinPlus | XBC | D txtime | 19 | 65 | 0 |
| Bitcoin Private | BTCP | C zcash | 1325 | 183 | 0 |
| Bitcoin SV | BSV | B forkid | 00 | 236 | 5 |
| BitcoinZ | BTCZ | C zcash | 1cb8 | 177 | 0 |
| BitcoinZero | BZX | A legacy | 4b | 284 | 0 |
| BitCore | BTX | A legacy | 03 | 160 | 4 |
| BitSend | BSD | A legacy | 66 | 91 | 2 |
| BitZeny | ZNY | A legacy | 51 | 123 | 0 |
| Blackcoin | BLK | D txtime | 19 | 10 | 3 |
| Bolivarcoin | BOLI | A legacy | 55 | 278 | 0 |
| Canada eCoin | CDN | A legacy | 1c | 34 | 0 |
| Cannacoin | CCN | D txtime (end) | 1c | 19 | 0 |
| Chips | CHIPS | A legacy | 3c | — | 0 |
| CivX | CIVX | research | — | — | 0 |
| ColossusXT | COLX | A legacy | 1e | 1999 | 1 |
| Crown | CRW | A legacy | 00 | 72 | 8 |
| Dash | DASH | A legacy | 4c | 5 | 5 |
| Decred | DCR | E special | 073f | 42 | 0 |
| DeepOnion | ONION | D txtime | 1f | 305 | 0 |
| Defcoin | DEFC | A legacy | 1e | 1337 | 0 |
| Denarius | D / DNR | D txtime | 1e | 116 | 0 |
| DigiByte | DGB | A legacy | 1e | 20 | 0 |
| Digitalcoin | DGC | A legacy | 1e | 18 | 0 |
| Dogecoin | DOGE | A legacy | 1e | 3 | 0 |
| Donu | DONU | A legacy | 35 | 405 | 0 |
| ECCoin | ECC | D txtime | 21 | 319 | 0 |
| e-Gulden | EFL | A legacy | 30 | 78 | 0 |
| Einsteinium | EMC2 | A legacy | 21 | 41 | 0 |
| Electra | ECA | D txtime | 21 | 249 | 0 |
| Electra Protocol | XEP | A legacy | 37 | 597 | 5 |
| Emercoin | EMC | D txtime | 21 | — | 0 |
| EuropeCoin | ERC | A legacy | 21 | 151 | 0 |
| EXOS | EXOS | D txtime | 1c | 248 | 0 |
| FairCoin | FAIR | A legacy | 5f | 298 | 2 |
| Feathercoin | FTC | A legacy | 0e | 8 | 3 |
| Ferrite | FEC | A legacy | 24 | — | 3 |
| Flashcoin | FLASH | A legacy | 44 | 120 | 0 |
| FujiCoin | FJC | A legacy | 24 | 75 | 0 |
| GameCredits | GAME | A legacy | 26 | 101 | 0 |
| Garlicoin | GRLC | A legacy | 26 | 69420 | 11 |
| GoByte | GBX | research | — | 176 | 0 |
| GravityCoin | GXX | A legacy | 28 | 285 | 0 |
| GravityZeroCoin | GZRO | D txtime | 26 | — | 0 |
| Groestlcoin | GRS | E special | 24 | 17 | 4 |
| HODLcoin | HODL / HODLC | A legacy | 28 | 1989 | 0 |
| Hush | HUSH | C zcash | 3c | 197 | 0 |
| Internet of People | IOP | A legacy | 75 | 66 | 0 |
| Ixcoin | IXC | A legacy | 8a | 86 | 0 |
| Komodo | KMD | C zcash | 3c | 141 | 0 |
| Koto | KOTO | C zcash | 1836 | 510 | 2 |
| LBRY Credits | LBC | A legacy | 55 | 140 | 0 |
| Linx | LINX | A legacy | 4b | 114 | 0 |
| Litecoin | LTC | A legacy | 30 | 2 | 6 |
| Litecoin Cash | LCC | A legacy | 1c | 192 | 0 |
| Lynx | LYNX | A legacy | 2d | 191 | 0 |
| Machinecoin | MAC | A legacy | 32 | — | 0 |
| Minexcoin | MNX | A legacy | 4b | 182 | 3 |
| MNPCoin | MNP | A legacy | 32 | 2001 | 1 |
| Monacoin | MONA | A legacy | 32 | 22 | 5 |
| Monaize | MNZ | C zcash | 3c | — | 0 |
| Monoeci | XMCC | research | — | 1998 | 0 |
| Motion | XMN | research | — | — | 0 |
| Myce | YCE | D txtime | 32 | 449 | 0 |
| Myriadcoin | XMY | A legacy | 32 | 90 | 0 |
| Namecoin | NMC | A legacy | 34 | 7 | 13 |
| Navcoin | NAV | E special | 35 | 130 | 0 |
| Neblio | NEBL | D txtime | 35 | 146 | 0 |
| NewYorkCoin | NYC | A legacy | 3c | 179 | 0 |
| NIX | NIX | A legacy | 26 | 400 | 0 |
| Noir | NOR | A legacy | 00 | 610 | 0 |
| ODIN | ODIN | A legacy | 73 | — | 0 |
| Onixcoin | ONX | A legacy | 4b | 174 | 0 |
| PACcoin | PAC | A legacy | 37 | 8192 | 2 |
| Peercoin | PPC | D txtime | 37 | 6 | 1 |
| PIVX | PIVX | E special | 1e | 119 | 0 |
| Polis | POLIS | A legacy | 37 | 1997 | 1 |
| Primecoin | XPM | A legacy | 17 | 24 | 1 |
| Quebecoin | QBC | A legacy | 3a | 387 | 0 |
| Ravencoin | RVN | A legacy | 3c | 175 | 0 |
| ReddCoin | RDD | D txtime (end) | 3d | 4 | 0 |
| Sibcoin | SIB | A legacy | 3f | — | 0 |
| Simplicity | SPL | D txtime | 12 | 448 | 0 |
| SmartCash | SMART | E special | 3f | 224 | 0 |
| Smileycoin | SMLY | A legacy | 19 | 59 | 0 |
| SnowGem | XSG / SNG | C zcash | 1c28 | — | 0 |
| Sumcoin | SUM | A legacy | 3f | 552 | 0 |
| Syscoin | SYS | A legacy | 3f | 57 | 0 |
| TokenPay | TPAY | E special | 41 | 265 | 2 |
| Trezarcoin | TZC | D txtime | 42 | 232 | 1 |
| Uniform Fiscal Object | UFO | A legacy | 1b | 202 | 1 |
| Unitus | UIS | A legacy | 44 | — | 1 |
| Unobtanium | UNO | A legacy | 82 | 92 | 0 |
| Verge | XVG | D txtime | 30 | 77 | 0 |
| Vertcoin | VTC | A legacy | 47 | 28 | 2 |
| Viacoin | VIA | A legacy | 47 | 14 | 4 |
| Xaya | CHI | A legacy | 1c | 509 | 2 |
| Xuez | XUEZ | A legacy | 48 | 225 | 0 |
| Zcash | ZEC | C zcash | 1cb8 | 133 | 0 |
| Zclassic | ZCL | C zcash | 1cb8 | 147 | 0 |
| Zcoin (now Firo) | XZC / FIRO | A legacy | 52 | 136 | 1 |
| ZelCash (now Flux) | ZEL / FLUX | C zcash | 1cb8 | 19167 | 0 |
| Zero | ZER | C zcash | 1cb8 | 323 | 0 |
