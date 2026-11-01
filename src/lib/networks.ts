/**
 * Coins MetaYoshi can hold. Each account derives one address per enabled
 * network from the same recovery phrase; the wallet shows one network at a time.
 *
 * Raptoreum: Core chainparams / ElectrumX coins.Raptoreum.
 * BitcoinZ: btcz/bitcoinz chainparams.cpp and consensus/upgrades.cpp.
 * Other coins: src/lib/coins/catalog.ts (ElectrumX coins.py and SLIP-0044),
 * enabled family by family as described in docs/MULTICOIN_PLAN.md.
 */
import bs58 from 'bs58'
import { CATALOG, type CatalogCoin, type CoinFamily } from './coins/catalog'
import { concatBytes, sha256d } from './rtm/bytes'

export type NetworkId = string

/** How transactions are serialized and signed. */
export type SignFamily = 'rtm' | 'btcz' | CoinFamily

export interface NetworkParams {
  id: NetworkId
  name: string
  symbol: string
  decimals: number
  /** SLIP-44 coin type for m/44'/{coinType}'/{account}'/0/0. */
  bip44CoinType: number
  /** Base58Check version bytes (some coins use two-byte prefixes). */
  p2pkhPrefix: Uint8Array
  p2shPrefix: Uint8Array
  /** Every P2SH version the coin accepts; the first is used for display. */
  p2shPrefixes: Uint8Array[]
  wifVersion: number
  genesisHash: string
  /**
   * A block after a chain split, for coins whose forks share the genesis block
   * (Bitcoin vs. Bitcoin Cash, SV, Gold...). Hash is the double SHA-256 block
   * hash, so only for coins that hash headers that way.
   */
  checkpoint?: { height: number; hash: string }
  /** Byte offset of nTime in a block header (80-byte Bitcoin-style vs. Equihash headers). */
  headerTimeOffset: number
  /** Raptoreum assets and the RTM ElectrumX extensions (asset index, get_in_block). */
  hasAssets: boolean
  /** HTTPS gateways publish /api/v1/servers lists among Raptoreum smartnodes. */
  peerDiscovery: boolean
  /** What addresses start with, for hints and error messages. */
  addressPrefix: string
  family: SignFamily
  /** Bech32 human-readable part; set for coins whose native SegWit addresses can be paid. */
  bech32Hrp?: string
  /** Transaction page, with {txid} in place of the transaction ID. */
  explorerTx?: string
  /** Smallest output created, in base units. */
  dustSats: bigint
  /** Lowest fee rate the coin's nodes relay, in base units per byte. */
  minFeePerByte: bigint
  /** Largest fee the wallet signs for this coin, in base units; a default applies when unset. */
  maxFeeSats?: bigint
  /** Browser-reachable ElectrumX endpoints (wss:// or HTTPS gateway); may be empty. */
  defaultServers: string[]
  /** TCP/SSL servers listed by ElectrumX, for reference and gateway setup. */
  knownServers: string[]
  /** False until the coin's transaction family is implemented and tested. */
  supported: boolean
  /** Why an unsupported coin is not available yet. */
  pendingReason?: string
}

function hex(text: string): Uint8Array {
  return Uint8Array.from(text.match(/../g)!.map((b) => Number.parseInt(b, 16)))
}

export const RTM_NETWORK: NetworkParams = {
  id: 'rtm',
  name: 'Raptoreum',
  symbol: 'RTM',
  decimals: 8,
  bip44CoinType: 175,
  p2pkhPrefix: Uint8Array.of(0x3c),
  p2shPrefix: Uint8Array.of(0x10),
  p2shPrefixes: [Uint8Array.of(0x10)],
  wifVersion: 0x80,
  genesisHash: 'b79e5df07278b9567ada8fc655ffbfa9d3f586dc38da3dd93053686f41caeea0',
  headerTimeOffset: 68,
  hasAssets: true,
  peerDiscovery: true,
  addressPrefix: 'R',
  family: 'rtm',
  explorerTx: `${String(import.meta.env.VITE_RTM_EXPLORER || 'https://explorer.raptoreum.com').replace(/\/+$/, '')}/transaction/{txid}`,
  dustSats: 1000n,
  minFeePerByte: 0n,
  defaultServers: [],
  knownServers: [],
  supported: true
}

export const BTCZ_NETWORK: NetworkParams = {
  id: 'btcz',
  name: 'BitcoinZ',
  symbol: 'BTCZ',
  decimals: 8,
  bip44CoinType: 177,
  p2pkhPrefix: Uint8Array.of(0x1c, 0xb8),
  p2shPrefix: Uint8Array.of(0x1c, 0xbd),
  p2shPrefixes: [Uint8Array.of(0x1c, 0xbd)],
  wifVersion: 0x80,
  genesisHash: 'f499ee3d498b4298ac6a64205b8addb7c43197e2a660229be65db8a4534d75c1',
  // version(4) + prevHash(32) + merkleRoot(32) + finalSaplingRoot(32)
  headerTimeOffset: 100,
  hasAssets: false,
  peerDiscovery: false,
  addressPrefix: 't1',
  family: 'btcz',
  explorerTx: `${String(import.meta.env.VITE_BTCZ_EXPLORER || 'https://explorer.btcz.rocks').replace(/\/+$/, '')}/tx/{txid}`,
  dustSats: 1000n,
  minFeePerByte: 0n,
  defaultServers: [],
  knownServers: ['electrum1.btcz.rocks s50002 t50001', 'electrum2.btcz.rocks s50002 t50001', 'electrum6.btcz.rocks s50002 t50001'],
  supported: true
}

/** Families whose signing and parsing are implemented. */
const IMPLEMENTED_FAMILIES = new Set<SignFamily>(['legacy'])

function pendingReason(coin: CatalogCoin): string | undefined {
  if (!IMPLEMENTED_FAMILIES.has(coin.family)) return `${coin.family} transactions are not implemented yet`
  if (coin.coinType === null) return 'No SLIP-44 coin type is registered for this coin'
  return undefined
}

/** The leading characters every P2PKH address of this version shares. */
function commonAddressPrefix(version: Uint8Array): string {
  const encode = (fill: number) => {
    const payload = concatBytes(version, new Uint8Array(20).fill(fill))
    return bs58.encode(concatBytes(payload, sha256d(payload).slice(0, 4)))
  }
  const low = encode(0x00)
  const high = encode(0xff)
  let i = 0
  while (i < low.length && low[i] === high[i]) i += 1
  // Some version bytes give addresses with either of two first characters (Namecoin: M or N).
  return i > 0 ? low.slice(0, i) : `${low[0]}/${high[0]}`
}

function fromCatalog(coin: CatalogCoin): NetworkParams {
  const p2shPrefixes = coin.p2sh.map(hex)
  const reason = pendingReason(coin)
  return {
    id: coin.id,
    name: coin.name,
    symbol: coin.symbol,
    decimals: coin.decimals ?? 8,
    bip44CoinType: coin.coinType ?? -1,
    p2pkhPrefix: hex(coin.p2pkh),
    p2shPrefix: p2shPrefixes[0],
    p2shPrefixes,
    wifVersion: Number.parseInt(coin.wif, 16),
    genesisHash: coin.genesis,
    checkpoint: coin.checkpoint ? { height: coin.checkpoint[0], hash: coin.checkpoint[1] } : undefined,
    headerTimeOffset: coin.headerTimeOffset ?? 68,
    hasAssets: false,
    peerDiscovery: false,
    addressPrefix: commonAddressPrefix(hex(coin.p2pkh)),
    family: coin.family,
    bech32Hrp: coin.hrp,
    explorerTx: coin.explorer,
    dustSats: BigInt(coin.dust ?? '1000'),
    minFeePerByte: BigInt(Math.ceil((coin.minFeeKb ?? 0) / 1000)),
    maxFeeSats: coin.maxFee ? BigInt(coin.maxFee) : undefined,
    defaultServers: coin.servers ?? [],
    knownServers: coin.knownServers ?? [],
    supported: reason === undefined,
    pendingReason: reason
  }
}

/** Every known coin, supported or not; RTM and BitcoinZ first. */
export const ALL_NETWORKS: NetworkParams[] = [
  RTM_NETWORK,
  BTCZ_NETWORK,
  ...CATALOG.map(fromCatalog).sort((a, b) => a.name.localeCompare(b.name))
]

export const NETWORKS: Record<NetworkId, NetworkParams> = Object.fromEntries(
  ALL_NETWORKS.filter((n) => n.supported).map((n) => [n.id, n])
)
/** Supported networks in display order. */
export const NETWORK_IDS: NetworkId[] = ALL_NETWORKS.filter((n) => n.supported).map((n) => n.id)
/** Enabled for new wallets, and offered once to existing wallets that predate an entry. */
export const DEFAULT_ENABLED_NETWORKS: NetworkId[] = ['rtm', 'btcz', 'ltc', 'btc', 'doge']

export function isNetworkId(value: unknown): value is NetworkId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(NETWORKS, value)
}

export function networkOf(id: unknown): NetworkParams {
  return isNetworkId(id) ? NETWORKS[id] : RTM_NETWORK
}

export function explorerUrl(network: NetworkParams, txid: string): string | null {
  return network.explorerTx ? network.explorerTx.replace('{txid}', txid) : null
}
