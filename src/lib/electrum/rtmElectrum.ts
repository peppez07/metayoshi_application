import { ElectrumClient, ElectrumError } from './client'
export { isValidServerUrl } from './client'
import { addressToScriptHash } from '../rtm/address'
import { toAtoms } from '../rtm/amount'
import { bytesToHex, hexToBytes, reverseBytes, sha256d } from '../rtm/bytes'
import type { AssetUtxo, CoinUtxo } from '../rtm/builder'
import { BTCZ_NETWORK, NETWORKS, RTM_NETWORK, type NetworkId, type NetworkParams } from '../networks'

export const BUILTIN_ELECTRUM_SERVER = 'https://144.202.18.233/api/v1/electrum'
export const LEGACY_ELECTRUM_SERVER = 'wss://144.202.18.233:50004'

function serverList(value: string): string[] {
  return value.split(',').map((s) => s.trim()).filter(Boolean)
}

/** Build-time custom defaults remain supported. */
export const DEFAULT_ELECTRUM_SERVERS: string[] = serverList(String(import.meta.env.VITE_RTM_ELECTRUM_SERVERS || BUILTIN_ELECTRUM_SERVER))

/**
 * Public BitcoinZ ElectrumX servers (electrum-btcz servers.json) on their
 * secure WebSocket port (btcz-electrum/electrumx-docker: 50004 = wss). A
 * browser only connects when the certificate is browser-trusted.
 */
export const BTCZ_PUBLIC_SERVERS = [
  'wss://electrum1.btcz.rocks:50004',
  'wss://electrum2.btcz.rocks:50004',
  'wss://electrum6.btcz.rocks:50004'
]

export const DEFAULT_BTCZ_ELECTRUM_SERVERS: string[] = serverList(String(import.meta.env.VITE_BTCZ_ELECTRUM_SERVERS || BTCZ_PUBLIC_SERVERS.join(',')))

/** Build-time defaults for any other coin: VITE_ELECTRUM_SERVERS_<SYMBOL>, comma-separated. */
const OTHER_DEFAULTS: Record<string, string | undefined> = import.meta.env as unknown as Record<string, string | undefined>

export function defaultServers(network: NetworkId): string[] {
  if (network === 'rtm') return [...DEFAULT_ELECTRUM_SERVERS]
  if (network === 'btcz') return [...DEFAULT_BTCZ_ELECTRUM_SERVERS]
  const configured = OTHER_DEFAULTS[`VITE_ELECTRUM_SERVERS_${network.toUpperCase()}`]
  return configured ? serverList(String(configured)) : [...(NETWORKS[network]?.defaultServers ?? [])]
}

export interface ServerFeatures {
  serverVersion: string
  genesisHash: string
  assetsReady: boolean
  assetIndexedHeight: number | null
}

export interface HistoryItem {
  txid: string
  height: number
  fee?: number
}

export interface AssetBalance {
  assetId: string
  confirmed: bigint
  unconfirmed: bigint
}

export interface AssetMetadata {
  assetId: string
  name: string
  decimalPoint: number
  isUnique: boolean
  updatable: boolean
  isRoot: boolean
  supply: bigint
  maxMintCount: number | null
  mintCount: number
  referenceHash: string
  owner: string
  creationHeight: number | null
}

const METHOD_NOT_FOUND = -32601

/** Floor used when the server reports no fee information. */
export const MIN_FEE_PER_BYTE = 2n

export const RTM_GENESIS_HASH = RTM_NETWORK.genesisHash
export const BTCZ_GENESIS_HASH = BTCZ_NETWORK.genesisHash

interface Page<T> {
  items: T[]
  cursor: string | null
}

let activeClient: ElectrumClient | null = null

export function getClient(url: string): ElectrumClient {
  if (activeClient && activeClient.url === url) return activeClient
  activeClient?.close()
  activeClient = new ElectrumClient(url)
  return activeClient
}

export function closeClient(): void {
  activeClient?.close()
  activeClient = null
}

/** Electrum API for one coin; Raptoreum by default, which adds the asset extensions. */
export class RtmElectrum {
  /** blockchain.transaction.get_in_block is an RTM ElectrumX extension. */
  private inBlockSupported: boolean

  constructor(readonly client: ElectrumClient, readonly network: NetworkParams = RTM_NETWORK) {
    this.inBlockSupported = network.hasAssets
  }

  private scriptHash(address: string): string {
    return addressToScriptHash(address, this.network)
  }

  async features(): Promise<ServerFeatures> {
    const result = await this.client.request<any>('server.features')
    const assets = result?.rtm_assets
    return {
      serverVersion: String(result?.server_version ?? this.client.serverVersion),
      genesisHash: String(result?.genesis_hash ?? ''),
      assetsReady: Boolean(assets?.ready),
      assetIndexedHeight: typeof assets?.indexed_height === 'number' ? assets.indexed_height : null
    }
  }

  /** Verifies the server serves this coin's mainnet before any wallet data is trusted. */
  async verifyNetwork(): Promise<ServerFeatures> {
    const features = await this.features()
    if (features.genesisHash !== this.network.genesisHash) {
      throw new ElectrumError(`Server is not a ${this.network.name} mainnet ElectrumX server (genesis hash mismatch)`)
    }
    const checkpoint = this.network.checkpoint
    if (checkpoint) {
      // Forks share the genesis block; the block after the split tells them apart.
      const header = await this.blockHeader(checkpoint.height).catch(() => '')
      const hash = /^[0-9a-f]{160}$/i.test(header) ? bytesToHex(reverseBytes(sha256d(hexToBytes(header)))) : ''
      if (hash !== checkpoint.hash) {
        throw new ElectrumError(`Server is not on the ${this.network.name} chain (block ${checkpoint.height} does not match; it may serve a fork of ${this.network.name})`)
      }
    }
    return this.network.hasAssets ? features : { ...features, assetsReady: false, assetIndexedHeight: null }
  }

  async tipHeight(): Promise<number> {
    const header = await this.client.request<{ height: number }>('blockchain.headers.subscribe')
    return Number(header?.height ?? 0)
  }

  onHeader(handler: (height: number) => void): () => void {
    return this.client.on('blockchain.headers.subscribe', (params) => {
      const height = Number((params[0] as any)?.height)
      if (Number.isFinite(height)) handler(height)
    })
  }

  async balance(address: string): Promise<{ confirmed: bigint; unconfirmed: bigint }> {
    const result = await this.client.request<{ confirmed: number; unconfirmed: number }>(
      'blockchain.scripthash.get_balance', [this.scriptHash(address)])
    return { confirmed: toAtoms(result.confirmed), unconfirmed: toAtoms(result.unconfirmed) }
  }

  async listUnspent(address: string): Promise<CoinUtxo[]> {
    const rows = await this.client.request<any[]>('blockchain.scripthash.listunspent', [this.scriptHash(address)])
    return (rows ?? []).map((row) => ({
      txid: String(row.tx_hash),
      vout: Number(row.tx_pos),
      value: toAtoms(row.value),
      height: Number(row.height)
    }))
  }

  async history(address: string): Promise<HistoryItem[]> {
    const rows = await this.client.request<any[]>('blockchain.scripthash.get_history', [this.scriptHash(address)])
    return (rows ?? []).map((row) => ({ txid: String(row.tx_hash), height: Number(row.height), fee: row.fee }))
  }

  async subscribeAddress(address: string): Promise<string | null> {
    return await this.client.request<string | null>('blockchain.scripthash.subscribe', [this.scriptHash(address)])
  }

  onAddressChange(handler: (scriptHash: string, status: string | null) => void): () => void {
    return this.client.on('blockchain.scripthash.subscribe', (params) => handler(String(params[0]), params[1] as string | null))
  }

  async blockHeader(height: number): Promise<string> {
    return await this.client.request<string>('blockchain.block.header', [height])
  }

  async getTransaction(txid: string): Promise<string> {
    return await this.client.request<string>('blockchain.transaction.get', [txid, false])
  }

  /**
   * Confirmed transactions via the RTM extension, which works on servers whose
   * Core has no txindex; mempool transactions (height <= 0) and servers
   * without the extension use blockchain.transaction.get.
   */
  async getTransactionAt(txid: string, height: number): Promise<string> {
    if (height > 0 && this.inBlockSupported) {
      try {
        return await this.client.request<string>('blockchain.transaction.get_in_block', [txid, height])
      } catch (error) {
        if (!(error instanceof ElectrumError) || error.code !== METHOD_NOT_FOUND) throw error
        this.inBlockSupported = false
      }
    }
    return await this.getTransaction(txid)
  }

  async broadcast(hex: string): Promise<string> {
    return await this.client.request<string>('blockchain.transaction.broadcast', [hex])
  }

  /** Fee rate in satoshis per byte: the higher of relay fee and the 6-block estimate. */
  async feePerByte(): Promise<bigint> {
    return (await this.feeRates()).feePerByte
  }

  /**
   * The rate to pay (relay fee, 6-block estimate and a floor, whichever is
   * highest) and the relay fee itself, which sets the dust limit. Servers
   * report coins per kilobyte; base units follow the coin's decimals.
   */
  async feeRates(): Promise<{ feePerByte: bigint; relayFeePerByte: bigint }> {
    const unitsPerCoin = 10 ** this.network.decimals
    const toPerByte = (coinPerKb: unknown): bigint => {
      const value = Number(coinPerKb)
      if (!Number.isFinite(value) || value <= 0) return 0n
      return BigInt(Math.ceil((value * unitsPerCoin) / 1000))
    }
    const [relay, estimate] = await Promise.all([
      this.client.request<number>('blockchain.relayfee').catch(() => 0),
      this.client.request<number>('blockchain.estimatefee', [6]).catch(() => -1)
    ])
    const relayFeePerByte = toPerByte(relay)
    const feePerByte = [relayFeePerByte, toPerByte(estimate), MIN_FEE_PER_BYTE, this.network.minFeePerByte].reduce((a, b) => (a > b ? a : b))
    return { feePerByte, relayFeePerByte }
  }

  // ── Assets ──────────────────────────────────────────────────────────────

  async assetBalances(address: string): Promise<AssetBalance[]> {
    const result = await this.client.request<any>('blockchain.scripthash.assets.get_balance', [this.scriptHash(address)])
    return Object.entries(result?.assets ?? {}).map(([assetId, b]: [string, any]) => ({
      assetId,
      confirmed: toAtoms(b.confirmed),
      unconfirmed: toAtoms(b.unconfirmed)
    }))
  }

  private async allPages<T>(fetchPage: (cursor: string | null) => Promise<Page<T>>): Promise<T[]> {
    const items: T[] = []
    let cursor: string | null = null
    for (let page = 0; page < 100; page += 1) {
      const result: Page<T> = await fetchPage(cursor)
      items.push(...result.items)
      if (!result.cursor) return items
      cursor = result.cursor
    }
    throw new ElectrumError('Too many asset pages')
  }

  async assetUnspent(address: string, assetId: string): Promise<AssetUtxo[]> {
    const scripthash = this.scriptHash(address)
    const rows = await this.allPages<any>(async (cursor) => {
      const result = await this.client.request<any>('blockchain.scripthash.assets.listunspent', [scripthash, assetId, cursor, 1000])
      return { items: result?.items ?? [], cursor: result?.cursor ?? null }
    })
    return rows.map((row) => ({
      txid: String(row.tx_hash),
      vout: Number(row.tx_pos),
      assetId: String(row.asset_id),
      amount: toAtoms(row.amount),
      height: Number(row.height ?? 0),
      uniqueId: row.is_unique ? toAtoms(row.unique_id) : null,
      script: hexToBytes(String(row.script)),
      spendable: row.spendable !== false
    }))
  }

  async assetHistory(address: string, assetId: string): Promise<Array<{ txid: string; height: number }>> {
    const scripthash = this.scriptHash(address)
    const rows = await this.allPages<any>(async (cursor) => {
      const result = await this.client.request<any>('blockchain.scripthash.assets.get_history', [scripthash, assetId, cursor, 1000])
      return { items: result?.items ?? [], cursor: result?.cursor ?? null }
    })
    return rows.map((row) => ({ txid: String(row.tx_hash), height: Number(row.height ?? 0) }))
  }

  async assetMetadata(assetId: string): Promise<AssetMetadata | null> {
    const result = await this.client.request<any>('blockchain.asset.get_metadata', [assetId])
    const m = result?.metadata
    if (!m) return null
    return {
      assetId,
      name: String(m.name ?? assetId),
      decimalPoint: Number(m.decimal_point ?? 8),
      isUnique: Boolean(m.is_unique),
      updatable: Boolean(m.updatable),
      isRoot: m.is_root !== false,
      supply: toAtoms(m.supply ?? 0),
      maxMintCount: m.max_mint_count === undefined ? null : Number(m.max_mint_count),
      mintCount: Number(m.mint_count ?? 0),
      referenceHash: String(m.reference_hash ?? ''),
      owner: String(m.owner ?? ''),
      creationHeight: typeof m.creation_height === 'number' ? m.creation_height : null
    }
  }

  async subscribeAssets(address: string): Promise<string | null> {
    return await this.client.request<string | null>('blockchain.scripthash.assets.subscribe', [this.scriptHash(address)])
  }

  onAssetChange(handler: (scriptHash: string) => void): () => void {
    return this.client.on('blockchain.scripthash.assets.subscribe', (params) => handler(String(params[0])))
  }
}
